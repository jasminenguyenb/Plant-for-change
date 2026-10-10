import { useEffect, useState, useMemo, Fragment } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db } from '../../firebase'

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  draft: 'Nháp',
  approved: 'Đang hoạt động',
  rejected: 'Đã từ chối',
}
const STATUS_STYLE = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
}
const TREE_CATEGORY_LABEL = {
  fruit: 'Cây ăn quả',
  shade: 'Cây bóng mát',
  native: 'Loài bản địa',
  evergreen: 'Cây thường xanh',
  flowering: 'Cây có hoa',
}
const HEALTH_LABEL = {
  healthy: 'Khỏe mạnh',
  'needs-water': 'Cần tưới nước',
  pest: 'Có sâu bệnh',
  damaged: 'Bị tổn thương',
  other: 'Khác',
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const treeIcon = L.divIcon({
  className: 'tree-marker-icon',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#22c55e;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="10" rx="6" ry="7" fill="#166534"/>
      <path d="M11 17h2v5h-2z" fill="#78350f"/>
      <path d="M10.5 16.5h3v1h-3z" fill="#92400e"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
})

const DEFAULT_MAP_CENTER = [21.0, 105.85]
const DEFAULT_MAP_ZOOM = 6
const GREEN_ZONE_STYLE = { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.35, weight: 2 }

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions || positions.length === 0) return
    const valid = positions.filter((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
    if (valid.length === 0) return
    try {
      if (valid.length === 1) {
        map.setView(valid[0], 14)
        return
      }
      const bounds = L.latLngBounds(valid)
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
    } catch (_) {}
  }, [map, positions])
  return null
}

function formatEventDate(dateValue) {
  if (!dateValue) return '—'
  try {
    const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function timeAgo(dateValue) {
  if (!dateValue) return ''
  const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
  if (Number.isNaN(d.getTime())) return ''
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return 'Vừa xong'
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`
  if (sec < 2592000) return `${Math.floor(sec / 86400)} ngày trước`
  if (sec < 31536000) return `${Math.floor(sec / 2592000)} tháng trước`
  return `${Math.floor(sec / 31536000)} năm trước`
}

function AdminEventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [updates, setUpdates] = useState([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [leftTab, setLeftTab] = useState('intro')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showLocationsModal, setShowLocationsModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    getDoc(doc(db, 'events', id))
      .then((snap) => {
        if (!snap.exists()) {
          setNotFound(true)
          setEvent(null)
        } else {
          setEvent({ id: snap.id, ...snap.data() })
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!event?.id) return
    setUpdatesLoading(true)
    getDocs(collection(db, 'events', event.id, 'updates'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0
          return tb - ta
        })
        setUpdates(list)
      })
      .catch(() => setUpdates([]))
      .finally(() => setUpdatesLoading(false))
  }, [event?.id])

  const locationsList = useMemo(() => {
    if (!event) return []
    const list = event.locations && Array.isArray(event.locations) && event.locations.length > 0
      ? event.locations
      : (event.location?.address != null || event.location?.lat != null
          ? [{ address: event.location?.address ?? '', lat: event.location?.lat ?? null, lng: event.location?.lng ?? null, date: event.date }]
          : [])
    return list
  }, [event])

  const locationsWithCoords = useMemo(
    () => locationsList.filter((loc) => loc.lat != null && loc.lng != null),
    [locationsList]
  )

  const mapPositions = useMemo(
    () => locationsWithCoords.map((loc) => [loc.lat, loc.lng]),
    [locationsWithCoords]
  )

  const greenMapData = useMemo(() => {
    return updates
      .filter((u) => u.polygon && Array.isArray(u.polygon) && u.polygon.length >= 3)
      .map((u) => ({
        polygon: u.polygon.map((p) => [p.lat, p.lng]),
        treePositions: (u.treePositions && Array.isArray(u.treePositions))
          ? u.treePositions.map((p) => [p.lat, p.lng])
          : [],
        update: u,
      }))
  }, [updates])

  const handleApprove = async () => {
    if (!event?.id || actionLoading) return
    setActionError('')
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'events', event.id), { status: 'approved', updatedAt: serverTimestamp() })
      setEvent((prev) => (prev ? { ...prev, status: 'approved' } : null))
    } catch (err) {
      setActionError(err?.message || 'Không thể duyệt.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!event?.id || actionLoading) return
    if (!window.confirm('Bạn có chắc muốn từ chối sự kiện này?')) return
    setActionError('')
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'events', event.id), { status: 'rejected', updatedAt: serverTimestamp() })
      setEvent((prev) => (prev ? { ...prev, status: 'rejected' } : null))
    } catch (err) {
      setActionError(err?.message || 'Không thể từ chối.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!event?.id || deleteLoading || actionLoading) return
    const msg = 'Xóa sự kiện sẽ xóa vĩnh viễn sự kiện này, tất cả cập nhật phát triển và danh sách người tham gia. Không thể hoàn tác.\n\nBạn có chắc muốn xóa?'
    if (!window.confirm(msg)) return
    setActionError('')
    setDeleteLoading(true)
    try {
      const eventId = event.id
      const updatesSnap = await getDocs(collection(db, 'events', eventId, 'updates'))
      const participantsSnap = await getDocs(collection(db, 'events', eventId, 'participants'))
      for (const d of updatesSnap.docs) await deleteDoc(doc(db, 'events', eventId, 'updates', d.id))
      for (const d of participantsSnap.docs) await deleteDoc(doc(db, 'events', eventId, 'participants', d.id))
      await deleteDoc(doc(db, 'events', eventId))
      navigate('/admin/events')
    } catch (err) {
      setActionError(err?.message || 'Không thể xóa sự kiện.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <span className="material-symbols-outlined text-6xl text-slate-400">event_busy</span>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Không tìm thấy sự kiện</h2>
        <Link to="/admin/events" className="rounded-lg bg-primary px-4 py-2 font-medium text-text-main">
          Quay lại danh sách
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Thanh trên: quay lại */}
      <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-surface-dark">
        <button
          type="button"
          onClick={() => navigate('/admin/events')}
          className="flex items-center gap-2 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Quay lại danh sách</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center font-display text-text-main">
        <div className="w-full max-w-[1600px] px-4 pb-12 md:px-6 lg:px-8">
          {/* Hero giống trang user */}
          <div className="group relative mt-6 h-64 w-full overflow-hidden rounded-2xl shadow-sm md:mt-8 md:h-96">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: event.coverImageUrl
                  ? `url("${event.coverImageUrl}")`
                  : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-forest) 100%)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white md:bottom-10 md:left-10">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${event.status === 'approved' ? 'bg-primary text-text-main' : event.status === 'rejected' ? 'bg-red-500/90 text-white' : 'bg-amber-400/90 text-amber-900'}`}>
                  {STATUS_LABEL[event.status] ?? event.status ?? 'Sự kiện'}
                </span>
                {event.treeCategory && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    {TREE_CATEGORY_LABEL[event.treeCategory] ?? event.treeCategory}
                  </span>
                )}
              </div>
              <h1 className="mb-2 text-3xl font-bold md:text-5xl">{event.title || 'Sự kiện'}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-200 md:text-base">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <span>
                  {locationsList.length === 0
                    ? 'Chưa có địa chỉ'
                    : locationsList.length === 1
                      ? (locationsList[0].address || 'Chưa có địa chỉ')
                      : `${locationsList.length} địa điểm`}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Cột trái - 3 tab giống user */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex rounded-xl border border-surface-light bg-white p-1.5 shadow-sm dark:border-surface-dark dark:bg-surface-dark">
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${leftTab === 'intro' ? 'bg-primary text-text-main shadow dark:bg-surface-dark dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-surface-light hover:text-text-main dark:hover:bg-slate-700 dark:hover:text-slate-200'}`}
                  onClick={() => setLeftTab('intro')}
                >
                  Giới thiệu sự kiện
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${leftTab === 'timeline' ? 'bg-primary text-text-main shadow dark:bg-surface-dark dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-surface-light hover:text-text-main dark:hover:bg-slate-700 dark:hover:text-slate-200'}`}
                  onClick={() => setLeftTab('timeline')}
                >
                  Dòng thời gian phát triển
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${leftTab === 'greenMap' ? 'bg-primary text-text-main shadow dark:bg-surface-dark dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-surface-light hover:text-text-main dark:hover:bg-slate-700 dark:hover:text-slate-200'}`}
                  onClick={() => setLeftTab('greenMap')}
                >
                  Bản đồ xanh
                </button>
              </div>

              {leftTab === 'intro' && (
                <div className="rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark md:p-8">
                  <h3 className="mb-4 text-xl font-bold text-text-main dark:text-white">Giới thiệu sự kiện</h3>
                  {event.description ? (
                    <div
                      className="prose prose-slate mb-6 max-w-none leading-relaxed text-slate-600 dark:prose-invert dark:text-slate-300"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  ) : (
                    <p className="mb-6 leading-relaxed text-slate-500 dark:text-slate-400">Chưa có mô tả.</p>
                  )}
                  <h4 className="mb-3 font-bold text-text-main dark:text-white">Mục tiêu tác động</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-primary/20 bg-surface-light p-4 dark:bg-background-dark/50">
                      <div className="mb-1 text-2xl font-bold text-primary">{event.targetTrees != null ? event.targetTrees.toLocaleString() : '—'}</div>
                      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Cây mục tiêu</div>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-surface-light p-4 dark:bg-background-dark/50">
                      <div className="mb-1 text-2xl font-bold text-primary">{event.targetVolunteers != null ? event.targetVolunteers.toLocaleString() : '—'}</div>
                      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Tình nguyện viên cần</div>
                    </div>
                  </div>
                </div>
              )}

              {leftTab === 'timeline' && (
                <div className="relative">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-text-main dark:text-white">
                      <span className="material-symbols-outlined text-primary">history_edu</span>
                      Dòng thời gian phát triển
                    </h3>
                  </div>
                  {updatesLoading ? (
                    <div className="flex justify-center py-12">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    </div>
                  ) : updates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center dark:border-slate-600 dark:bg-slate-800/30">
                      <span className="material-symbols-outlined text-4xl text-slate-400">trending_up</span>
                      <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">Chưa có cập nhật nào</p>
                    </div>
                  ) : (
                    <div className="relative space-y-8 pl-6 before:absolute before:left-[11px] before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-200 before:content-[''] dark:before:bg-slate-700">
                      {updates.map((u, index) => (
                        <div key={u.id} className="relative pl-8">
                          <div className={`absolute left-0 top-0 z-10 h-6 w-6 rounded-full border-4 border-white shadow-sm dark:border-background-dark ${u.isMilestone ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <div className="overflow-hidden rounded-xl border border-surface-light bg-white shadow-sm dark:border-surface-dark dark:bg-surface-dark">
                            <div className="p-5">
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-sm font-bold text-primary">
                                    {u.createdByEmail?.[0]?.toUpperCase() ?? '?'}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-text-main dark:text-white">{u.createdByEmail || 'Thành viên'}</h4>
                                    <p className="text-xs text-slate-500">{timeAgo(u.createdAt)}</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(u.locationAddress != null || u.locationIndex != null) && (
                                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300" title={u.locationAddress || ''}>
                                      <span className="material-symbols-outlined mr-0.5 align-middle text-sm">location_on</span>
                                      Địa điểm {(u.locationIndex ?? 0) + 1}
                                    </span>
                                  )}
                                  {u.isMilestone && <span className="rounded bg-primary/20 px-2 py-1 text-xs font-medium text-primary">Mốc quan trọng</span>}
                                  {u.treesPlanted != null && <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Đã trồng: {u.treesPlanted} cây</span>}
                                  {u.health && <span className="rounded bg-surface-light px-2 py-1 text-xs font-medium text-text-muted dark:bg-slate-800">{HEALTH_LABEL[u.health] ?? u.health}</span>}
                                  {u.treeName && <span className="rounded bg-primary/15 px-2 py-1 text-xs font-medium text-forest dark:bg-primary/25 dark:text-primary">{u.treeName}</span>}
                                </div>
                              </div>
                              {u.notes && <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{u.notes}</p>}
                              {(u.height != null || u.treesPlanted != null || (u.imageUrls?.length > 0)) && (
                                <div className="mb-4 space-y-2">
                                  {u.height != null && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-text-main dark:text-white">Chiều cao:</span> {u.height} cm</p>}
                                  {u.treesPlanted != null && <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-text-main dark:text-white">Số cây đã trồng:</span> {u.treesPlanted}</p>}
                                  {u.imageUrls?.length > 0 && (
                                    <div className={`grid gap-2 ${u.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                      {u.imageUrls.map((url, i) => (
                                        <button key={i} type="button" className="h-40 overflow-hidden rounded-lg bg-slate-100 text-left dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary" onClick={() => setLightboxImage(url)}>
                                          <img src={url} alt="" className="h-full w-full object-cover transition hover:opacity-90" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftTab === 'greenMap' && (
                <div className="rounded-xl border border-surface-light bg-white overflow-hidden shadow-sm dark:border-surface-dark dark:bg-surface-dark">
                  <h3 className="border-b border-surface-light px-6 py-4 text-xl font-bold text-text-main dark:border-slate-700 dark:text-white">
                    <span className="material-symbols-outlined mr-2 align-middle text-primary">map</span>
                    Bản đồ xanh
                  </h3>
                  {greenMapData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">grass</span>
                      <p className="mt-3 font-medium text-slate-600 dark:text-slate-400">Chưa có vùng xanh nào</p>
                      <p className="mt-1 text-sm text-slate-500">Các vùng xanh hiển thị khi có cập nhật kèm vẽ vùng trên bản đồ.</p>
                    </div>
                  ) : (
                    <div className="relative h-[480px] w-full">
                      <MapContainer
                        center={mapPositions.length > 0 ? mapPositions[0] : DEFAULT_MAP_CENTER}
                        zoom={mapPositions.length > 0 ? 14 : DEFAULT_MAP_ZOOM}
                        className="h-full w-full"
                        scrollWheelZoom
                      >
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {greenMapData.length > 0 && <FitBounds positions={greenMapData.flatMap((d) => [...d.polygon, ...d.treePositions])} />}
                        {greenMapData.map((data, idx) => (
                          <Fragment key={idx}>
                            <Polygon positions={data.polygon} pathOptions={GREEN_ZONE_STYLE}>
                              <Popup>
                                <div className="min-w-[240px] max-w-[320px] text-left">
                                  <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-600">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                                      {(data.update.createdByEmail || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-800 dark:text-white">{data.update.createdByEmail || 'Thành viên'}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(data.update.createdAt)}</p>
                                    </div>
                                  </div>
                                  {(data.update.locationAddress != null || data.update.locationIndex != null) && (
                                    <p className="mb-1 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-slate-400">location_on</span>
                                      <span>Địa điểm {(data.update.locationIndex ?? 0) + 1}{data.update.locationAddress ? ` · ${data.update.locationAddress.length > 60 ? data.update.locationAddress.slice(0, 60) + '…' : data.update.locationAddress}` : ''}</span>
                                    </p>
                                  )}
                                  {data.update.treeName && <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Tên cây:</span> {data.update.treeName}</p>}
                                  {data.update.treesPlanted != null && <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Số cây đã trồng:</span> {data.update.treesPlanted}</p>}
                                  {data.update.height != null && <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Chiều cao:</span> {data.update.height} cm</p>}
                                  {data.update.health && <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Tình trạng:</span> {HEALTH_LABEL[data.update.health] ?? data.update.health}</p>}
                                  {data.update.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">{data.update.notes}</p>}
                                  {data.update.isMilestone && <span className="mt-2 inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Mốc quan trọng</span>}
                                </div>
                              </Popup>
                            </Polygon>
                            {data.treePositions.map((pos, i) => (
                              <Marker key={`${idx}-${i}`} position={pos} icon={treeIcon} />
                            ))}
                          </Fragment>
                        ))}
                      </MapContainer>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar phải - hành động admin + thông tin giống user */}
            <div className="space-y-6">
              <div className="sticky top-28 rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark">
                {actionError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
                {event.status === 'pending' && (
                  <div className="mb-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-text-main shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined">{actionLoading ? 'progress_activity animate-spin' : 'check_circle'}</span>
                      Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-3 font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <span className="material-symbols-outlined">cancel</span>
                      Từ chối
                    </button>
                  </div>
                )}
                <div className="mb-4 flex flex-col gap-2">
                  <Link
                    to={`/su-kien/${event.id}`}
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <span className="material-symbols-outlined">visibility</span>
                    Xem trang người dùng
                  </Link>
                  <Link
                    to="/ban-do"
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-text-main shadow-sm transition hover:bg-primary-hover"
                  >
                    <span className="material-symbols-outlined">map</span>
                    Mở trang bản đồ
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={deleteLoading || actionLoading}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                  >
                    {deleteLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">delete_forever</span>
                        Xóa sự kiện
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-5 border-t border-slate-100 pt-4 dark:border-slate-700">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-light dark:bg-slate-800">
                      <span className="material-symbols-outlined text-text-muted">calendar_month</span>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-text-main dark:text-white">Ngày & giờ</h5>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatEventDate(event.date)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-light dark:bg-slate-800">
                      <span className="material-symbols-outlined text-text-muted">map</span>
                    </div>
                    <div className="w-full min-w-0">
                      <h5 className="mb-2 text-sm font-bold text-text-main dark:text-white">Địa điểm</h5>
                      {locationsList.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có địa chỉ</p>
                      ) : (
                        <>
                          <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                            {(locationsList.length > 2 ? locationsList.slice(0, 2) : locationsList).map((loc, idx) => (
                              <li key={idx} className="flex flex-col gap-0.5">
                                <span className="font-medium text-text-main dark:text-slate-200">{loc.address || 'Chưa có địa chỉ'}</span>
                                {loc.date != null && <span className="text-xs text-slate-500">{formatEventDate(loc.date)}</span>}
                              </li>
                            ))}
                          </ul>
                          {locationsList.length > 2 && (
                            <button type="button" onClick={() => setShowLocationsModal(true)} className="mt-2 text-xs font-medium text-primary hover:underline">
                              Xem thêm {locationsList.length - 2} địa điểm
                            </button>
                          )}
                        </>
                      )}
                      <div className="mt-3">
                        {mapPositions.length > 0 ? (
                          <button
                            type="button"
                            className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={() => setShowMapModal(true)}
                          >
                            <MapContainer center={mapPositions[0]} zoom={14} className="h-full w-full rounded-lg pointer-events-none" scrollWheelZoom={false} zoomControl={false}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              {locationsWithCoords.map((loc, idx) => (
                                <Marker key={idx} position={[loc.lat, loc.lng]} icon={treeIcon} />
                              ))}
                              <FitBounds positions={mapPositions} />
                            </MapContainer>
                            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-white/95 px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                              <span className="material-symbols-outlined text-sm">map</span>
                              Bấm để xem bản đồ
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                            <span className="material-symbols-outlined text-3xl text-slate-400">location_off</span>
                            <span className="ml-2 text-sm text-slate-500">Chưa có tọa độ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-lg font-bold text-primary">
                      {event.createdByEmail?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-text-main dark:text-white">Người tổ chức</h5>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{event.createdByEmail || '—'}</p>
                      {event.createdByEmail && (
                        <a className="mt-0.5 text-xs font-medium text-primary hover:underline" href={`mailto:${event.createdByEmail}`}>Liên hệ</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal danh sách địa điểm */}
      {showLocationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={() => setShowLocationsModal(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-light px-5 py-4 dark:border-slate-700">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-main dark:text-white">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Danh sách địa điểm
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setShowLocationsModal(false)} aria-label="Đóng">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
              {locationsList.map((loc, idx) => (
                <li key={idx} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800/30">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-main dark:text-slate-200">{loc.address || 'Chưa có địa chỉ'}</p>
                    {loc.date != null && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatEventDate(loc.date)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal bản đồ lớn */}
      {showMapModal && mapPositions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={() => setShowMapModal(false)}>
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-light px-5 py-4 dark:border-slate-700">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-main dark:text-white">
                <span className="material-symbols-outlined text-primary">map</span>
                Bản đồ địa điểm
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setShowMapModal(false)} aria-label="Đóng">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <MapContainer center={mapPositions[0]} zoom={14} className="h-full w-full rounded-b-2xl" scrollWheelZoom>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {locationsWithCoords.map((loc, idx) => (
                  <Marker key={idx} position={[loc.lat, loc.lng]} icon={treeIcon} />
                ))}
                <FitBounds positions={mapPositions} />
              </MapContainer>
            </div>
            <div className="flex justify-end border-t border-surface-light p-3 dark:border-slate-700">
              <Link to="/ban-do" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-main transition hover:bg-primary-hover">
                <span className="material-symbols-outlined text-lg">map</span>
                Mở trang bản đồ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox ảnh */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightboxImage(null)} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
          <img src={lightboxImage} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

export default AdminEventDetailPage
