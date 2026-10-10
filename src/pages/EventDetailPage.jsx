import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db, storage } from '../../firebase'
import { useAuth } from '../contexts/AuthContext'
import { MainLayout } from '../layouts/MainLayout'

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

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions || positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 14)
      return
    }
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
  }, [map, positions])
  return null
}

function SetView({ center, zoom = 14 }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) map.setView(center, zoom)
  }, [map, center, zoom])
  return null
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

const GREEN_ZONE_STYLE = { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.35, weight: 2 }

/** Kiểm tra điểm [lat, lng] có nằm trong polygon (mảng [lat, lng][]) */
function pointInPolygon(point, polygon) {
  const [x, y] = point
  const n = polygon.length
  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

/** Sinh ngẫu nhiên `count` điểm nằm trong polygon (tối đa 500 điểm) */
function getRandomPointsInPolygon(polygon, count) {
  if (!polygon || polygon.length < 3 || count <= 0) return []
  const n = Math.min(Math.max(0, Math.floor(Number(count))), 500)
  const lats = polygon.map((p) => p[0])
  const lngs = polygon.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const points = []
  let attempts = 0
  const maxAttempts = n * 50
  while (points.length < n && attempts < maxAttempts) {
    const lat = minLat + Math.random() * (maxLat - minLat)
    const lng = minLng + Math.random() * (maxLng - minLng)
    if (pointInPolygon([lat, lng], polygon)) points.push([lat, lng])
    attempts += 1
  }
  return points
}

const TREE_CATEGORY_LABEL = {
  fruit: 'Cây ăn quả',
  shade: 'Cây bóng mát',
  native: 'Loài bản địa',
  evergreen: 'Cây thường xanh',
  flowering: 'Cây có hoa',
}

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  draft: 'Nháp',
  approved: 'Đang hoạt động',
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

const HEALTH_LABEL = {
  healthy: 'Khỏe mạnh',
  'needs-water': 'Cần tưới nước',
  pest: 'Có sâu bệnh',
  damaged: 'Bị tổn thương',
  other: 'Vấn đề khác',
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

function EventDetailPage() {
  const { id } = useParams()
  const { user, isLoggedIn } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateImages, setUpdateImages] = useState([]) // { file, previewUrl }[], max 4
  const [updateHeight, setUpdateHeight] = useState('')
  const [updateHealth, setUpdateHealth] = useState('healthy')
  const [updateTreesPlanted, setUpdateTreesPlanted] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [updateTreeName, setUpdateTreeName] = useState('')
  const [updateMilestone, setUpdateMilestone] = useState(false)
  const [updateLocationIndex, setUpdateLocationIndex] = useState(0)
  const [updateStep, setUpdateStep] = useState(1) // 1: địa điểm, 2: thông tin, 3: map vùng xanh
  const [updatePolygonPoints, setUpdatePolygonPoints] = useState([]) // [ [lat, lng], ... ] — vùng xanh trong modal bản đồ
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [updates, setUpdates] = useState([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const updateFileInputRef = useRef(null)
  const [myParticipation, setMyParticipation] = useState(null) // null | { status: 'pending' | 'approved' }
  const [joinLoading, setJoinLoading] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('info') // 'info' | 'requests' (chỉ dùng khi isOwner)
  const [leftTab, setLeftTab] = useState('intro') // 'intro' | 'timeline' | 'greenMap' — 3 tab bên trái
  const [joinRequests, setJoinRequests] = useState([]) // { id: userId, userEmail, createdAt }[] pending
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false)
  const [actioningUserId, setActioningUserId] = useState(null) // userId đang duyệt/từ chối
  const [approvedParticipants, setApprovedParticipants] = useState([]) // { id, userEmail }[] đã duyệt
  const [showLocationsModal, setShowLocationsModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)

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

  /** Số lượng marker cây random trong polygon (bước 3) = số cây đã điền */
  const treeMarkersInPolygon = useMemo(() => {
    if (updatePolygonPoints.length < 3) return []
    const num = Math.max(0, Math.floor(Number(updateTreesPlanted) || 0))
    if (num === 0) return []
    return getRandomPointsInPolygon(updatePolygonPoints, num)
  }, [updatePolygonPoints, updateTreesPlanted])

  /** Dữ liệu vùng xanh từ các cập nhật (tab Bản đồ xanh), kèm update để hiện popup */
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
    const q = query(
      collection(db, 'events', event.id, 'updates'),
      orderBy('createdAt', 'desc')
    )
    getDocs(q)
      .then((snap) => setUpdates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setUpdates([]))
      .finally(() => setUpdatesLoading(false))
  }, [event?.id])

  useEffect(() => {
    if (!event?.id || !user?.uid || event?.createdBy === user.uid) {
      setMyParticipation(null)
      return
    }
    getDoc(doc(db, 'events', event.id, 'participants', user.uid))
      .then((snap) => {
        if (snap.exists()) setMyParticipation({ status: snap.data().status || 'pending' })
        else setMyParticipation(null)
      })
      .catch(() => setMyParticipation(null))
  }, [event?.id, event?.createdBy, user?.uid])

  // Đồng bộ "dự án đã tham gia" khi user đã duyệt mở trang — ghi vào users/{uid}/joinedEvents (chỉ user tự ghi, không cần rule đặc biệt)
  useEffect(() => {
    if (!event?.id || !user?.uid || myParticipation?.status !== 'approved') return
    setDoc(doc(db, 'users', user.uid, 'joinedEvents', event.id), { eventId: event.id, joinedAt: serverTimestamp() }, { merge: true }).catch(() => {})
  }, [event?.id, user?.uid, myParticipation?.status])

  useEffect(() => {
    if (!event?.id) return
    getDocs(collection(db, 'events', event.id, 'participants'))
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.status === 'approved')
        setApprovedParticipants(list)
      })
      .catch(() => setApprovedParticipants([]))
  }, [event?.id])

  const isOwner = isLoggedIn && user?.uid && event?.createdBy === user.uid
  const canPostUpdates = isOwner || myParticipation?.status === 'approved'

  const handleJoinEvent = useCallback(async () => {
    if (!event?.id || !user?.uid || isOwner || myParticipation) return
    setJoinLoading(true)
    try {
      await setDoc(doc(db, 'events', event.id, 'participants', user.uid), {
        status: 'pending',
        userEmail: user.email || null,
        createdAt: serverTimestamp(),
      })
      setMyParticipation({ status: 'pending' })
    } catch (err) {
      console.error('Join event error:', err)
    } finally {
      setJoinLoading(false)
    }
  }, [event?.id, user, isOwner, myParticipation])

  useEffect(() => {
    if (!event?.id || !isOwner) {
      setJoinRequests([])
      return
    }
    setJoinRequestsLoading(true)
    getDocs(collection(db, 'events', event.id, 'participants'))
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.status === 'pending')
        setJoinRequests(list)
      })
      .catch(() => setJoinRequests([]))
      .finally(() => setJoinRequestsLoading(false))
  }, [event?.id, isOwner])

  const handleApproveParticipant = useCallback(async (req) => {
    if (!event?.id || !req?.id) return
    setActioningUserId(req.id)
    try {
      await updateDoc(doc(db, 'events', event.id, 'participants', req.id), { status: 'approved' })
      setJoinRequests((prev) => prev.filter((r) => r.id !== req.id))
      setApprovedParticipants((prev) => [...prev, { id: req.id, userEmail: req.userEmail }])
    } catch (err) {
      console.error('Approve participant error:', err)
    } finally {
      setActioningUserId(null)
    }
  }, [event?.id])

  const handleRejectParticipant = useCallback(async (userId) => {
    if (!event?.id || !userId) return
    setActioningUserId(userId)
    try {
      await deleteDoc(doc(db, 'events', event.id, 'participants', userId))
      setJoinRequests((prev) => prev.filter((r) => r.id !== userId))
    } catch (err) {
      console.error('Reject participant error:', err)
    } finally {
      setActioningUserId(null)
    }
  }, [event?.id])

  const openUpdateModal = useCallback(() => {
    setUpdateImages([])
    setUpdateHeight('')
    setUpdateHealth('healthy')
    setUpdateTreesPlanted('')
    setUpdateNotes('')
    setUpdateTreeName('')
    setUpdateMilestone(false)
    setUpdateLocationIndex(0)
    setUpdateStep(1)
    setUpdatePolygonPoints([])
    setShowUpdateModal(true)
  }, [])

  const closeUpdateModal = useCallback(() => {
    setShowUpdateModal(false)
    setUpdateStep(1)
    setUpdateImages((prev) => {
      prev.forEach(({ previewUrl }) => previewUrl && URL.revokeObjectURL(previewUrl))
      return []
    })
  }, [])

  const handleUpdateImagesChange = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUpdateImages((prev) => {
      const next = [...prev]
      for (const file of files) {
        if (next.length >= 4) break
        if (!file.type.startsWith('image/')) continue
        next.push({ file, previewUrl: URL.createObjectURL(file) })
      }
      return next
    })
    if (updateFileInputRef.current) updateFileInputRef.current.value = ''
  }, [])

  const removeUpdateImage = useCallback((index) => {
    setUpdateImages((prev) => {
      const next = prev.slice()
      if (next[index]?.previewUrl) URL.revokeObjectURL(next[index].previewUrl)
      next.splice(index, 1)
      return next
    })
  }, [])

  const handlePublishUpdate = useCallback(async () => {
    if (!event?.id || !user) return
    setUpdateSubmitting(true)
    try {
      const loc = locationsList[updateLocationIndex]
      const hasPolygon = updatePolygonPoints.length >= 3
      const numTrees = Math.max(0, Math.floor(Number(updateTreesPlanted) || 0))
      const treePositions = hasPolygon && numTrees > 0
        ? getRandomPointsInPolygon(updatePolygonPoints, numTrees).map(([lat, lng]) => ({ lat, lng }))
        : null
      const docRef = await addDoc(collection(db, 'events', event.id, 'updates'), {
        createdBy: user.uid,
        createdByEmail: user.email || null,
        createdAt: serverTimestamp(),
        locationIndex: updateLocationIndex,
        locationAddress: loc?.address || null,
        treeName: (updateTreeName || '').trim() || null,
        imageUrls: [],
        height: updateHeight ? Number(updateHeight) : null,
        health: updateHealth || null,
        treesPlanted: updateTreesPlanted ? Number(updateTreesPlanted) : null,
        notes: (updateNotes || '').trim() || null,
        isMilestone: !!updateMilestone,
        polygon: hasPolygon ? updatePolygonPoints.map(([lat, lng]) => ({ lat, lng })) : null,
        treePositions,
      })
      const imageUrls = []
      if (updateImages.length > 0) {
        for (let i = 0; i < updateImages.length; i++) {
          const { file } = updateImages[i]
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `events/${event.id}/updates/${docRef.id}/${i}.${ext}`
          const storageRef = ref(storage, path)
          await uploadBytes(storageRef, file)
          imageUrls.push(await getDownloadURL(storageRef))
        }
        await updateDoc(docRef, { imageUrls })
      }
      setUpdates((prev) => [
        {
          id: docRef.id,
          createdBy: user.uid,
          createdByEmail: user.email || null,
          createdAt: { toDate: () => new Date() },
          locationIndex: updateLocationIndex,
          locationAddress: loc?.address || null,
          treeName: (updateTreeName || '').trim() || null,
          imageUrls,
          height: updateHeight ? Number(updateHeight) : null,
          health: updateHealth || null,
          treesPlanted: updateTreesPlanted ? Number(updateTreesPlanted) : null,
          notes: (updateNotes || '').trim() || null,
          isMilestone: !!updateMilestone,
          polygon: hasPolygon ? updatePolygonPoints.map(([lat, lng]) => ({ lat, lng })) : null,
          treePositions,
        },
        ...prev,
      ])
      closeUpdateModal()
    } catch (err) {
      console.error('Publish update error:', err)
    } finally {
      setUpdateSubmitting(false)
    }
  }, [event?.id, user, locationsList, updateLocationIndex, updateTreeName, updatePolygonPoints, updateImages, updateHeight, updateHealth, updateTreesPlanted, updateNotes, updateMilestone, closeUpdateModal])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-light px-4 dark:bg-background-dark">
        <span className="material-symbols-outlined text-6xl text-slate-400">event_busy</span>
        <h2 className="text-xl font-bold text-text-main dark:text-white">Không tìm thấy sự kiện</h2>
        <Link className="rounded-lg bg-primary px-4 py-2 font-medium text-text-main" to="/">
          Về trang chủ
        </Link>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col items-center font-display text-text-main">
        <div className="w-full max-w-[1600px] px-4 pb-12 md:px-6 lg:px-8">
            {/* Hero ảnh sự kiện */}
            <div className="group relative mt-7 h-[15rem] w-full overflow-hidden rounded-2xl shadow-sm md:mt-9 md:h-[21rem]">
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
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-text-main">
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
              {/* Cột trái - 3 tab: Giới thiệu, Dòng thời gian, Bản đồ xanh */}
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
                        <p className="mt-1 text-sm text-slate-500">Chủ sự kiện và thành viên đã duyệt có thể đăng cập nhật từ sidebar.</p>
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
                                    {u.height != null && (
                                      <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-text-main dark:text-white">Chiều cao:</span> {u.height} cm</p>
                                    )}
                                    {u.treesPlanted != null && (
                                      <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-text-main dark:text-white">Số cây đã trồng:</span> {u.treesPlanted}</p>
                                    )}
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
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Các vùng xanh sẽ hiển thị khi có cập nhật phát triển kèm vẽ vùng trên bản đồ.</p>
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
                          {greenMapData.length > 0 && (
                            <FitBounds
                              positions={greenMapData.flatMap((d) => [...d.polygon, ...d.treePositions])}
                            />
                          )}
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
                                    {data.update.treeName && (
                                      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Tên cây:</span> {data.update.treeName}</p>
                                    )}
                                    {data.update.treesPlanted != null && (
                                      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Số cây đã trồng:</span> {data.update.treesPlanted}</p>
                                    )}
                                    {data.update.height != null && (
                                      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Chiều cao:</span> {data.update.height} cm</p>
                                    )}
                                    {data.update.health && (
                                      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300"><span className="font-medium text-slate-700 dark:text-slate-200">Tình trạng:</span> {HEALTH_LABEL[data.update.health] ?? data.update.health}</p>
                                    )}
                                    {data.update.notes && (
                                      <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">{data.update.notes}</p>
                                    )}
                                    {data.update.isMilestone && (
                                      <span className="mt-2 inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Mốc quan trọng</span>
                                    )}
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

              {/* Sidebar phải - sticky */}
              <div className="space-y-6">
                <div className="sticky top-28 rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark">
                  {isOwner && (
                    <Link
                      to={`/su-kien/${event.id}/chinh-sua`}
                      className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-transparent py-3 font-bold text-primary shadow-sm transition hover:bg-primary/10 dark:hover:bg-primary/20"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Chỉnh sửa sự kiện
                    </Link>
                  )}
                  {canPostUpdates && (
                    <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-text-main shadow-sm transition hover:bg-primary-hover" type="button" onClick={openUpdateModal}>
                      <span className="material-symbols-outlined">add_a_photo</span>
                      Đăng cập nhật phát triển
                    </button>
                  )}
                  {isOwner && (
                    <div className="mb-4 flex rounded-lg border border-surface-light bg-surface-light/50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
                      <button
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition ${sidebarTab === 'info' ? 'bg-white text-text-main shadow dark:bg-surface-dark dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-text-main dark:hover:text-slate-200'}`}
                        type="button"
                        onClick={() => setSidebarTab('info')}
                      >
                        Thông tin
                      </button>
                      <button
                        className={`flex-1 rounded-md py-2 text-sm font-medium transition ${sidebarTab === 'requests' ? 'bg-white text-text-main shadow dark:bg-surface-dark dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-text-main dark:hover:text-slate-200'}`}
                        type="button"
                        onClick={() => setSidebarTab('requests')}
                      >
                        Người xin gia nhập
                        {joinRequests.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-text-main">{joinRequests.length}</span>
                        )}
                      </button>
                    </div>
                  )}
                  {isOwner && sidebarTab === 'requests' ? (
                    <div className="space-y-4">
                      <h5 className="text-sm font-bold text-text-main dark:text-white">Yêu cầu tham gia</h5>
                      {joinRequestsLoading ? (
                        <div className="flex justify-center py-8">
                          <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                        </div>
                      ) : joinRequests.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Chưa có ai xin gia nhập.</p>
                      ) : (
                        <ul className="space-y-3">
                          {joinRequests.map((req) => (
                            <li key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface-light bg-surface-light/30 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-text-main dark:text-white">{req.userEmail || 'Thành viên'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{req.createdAt?.toDate ? timeAgo(req.createdAt) : ''}</p>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <button
                                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-text-main transition hover:bg-primary-hover disabled:opacity-50"
                                  type="button"
                                  onClick={() => handleApproveParticipant(req)}
                                  disabled={actioningUserId === req.id}
                                  title="Duyệt"
                                >
                                  {actioningUserId === req.id ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span> : 'Duyệt'}
                                </button>
                                <button
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-surface-dark dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
                                  type="button"
                                  onClick={() => handleRejectParticipant(req.id)}
                                  disabled={actioningUserId === req.id}
                                  title="Từ chối"
                                >
                                  {actioningUserId === req.id ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span> : 'Từ chối'}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                  <div className="space-y-5">
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
                              <button
                                type="button"
                                onClick={() => setShowLocationsModal(true)}
                                className="mt-2 text-xs font-medium text-primary hover:underline"
                              >
                                Xem thêm {locationsList.length - 2} địa điểm
                              </button>
                            )}
                          </>
                        )}
                        <div className="mt-3">
                          {mapPositions.length > 0 ? (
                            <button
                              type="button"
                              className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              onClick={() => setShowMapModal(true)}
                            >
                              <MapContainer
                                center={DEFAULT_MAP_CENTER}
                                zoom={DEFAULT_MAP_ZOOM}
                                className="h-full w-full rounded-lg pointer-events-none"
                                scrollWheelZoom={false}
                                zoomControl={false}
                              >
                                <TileLayer
                                  attribution='&copy; OpenStreetMap'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
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
                            <Link to="/ban-do" className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                              <span className="material-symbols-outlined text-3xl text-slate-400">location_off</span>
                              <span className="ml-2 text-sm text-slate-500">Chưa có tọa độ</span>
                            </Link>
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">{event.createdByEmail || 'Plant for Change'}</p>
                        {event.createdByEmail && (
                          <a className="mt-0.5 text-xs font-medium text-primary hover:underline" href={`mailto:${event.createdByEmail}`}>Liên hệ</a>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-bold text-text-main dark:text-white">Người tham gia ({approvedParticipants.length})</h5>
                      </div>
                      <div className="flex -space-x-2 overflow-hidden py-1">
                        {approvedParticipants.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có ai tham gia.</p>
                        ) : (
                          <>
                            {approvedParticipants.slice(0, 5).map((p) => (
                              <div key={p.id} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-white dark:ring-surface-dark" title={p.userEmail || ''}>
                                {(p.userEmail || '?')[0].toUpperCase()}
                              </div>
                            ))}
                            {approvedParticipants.length > 5 && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-light text-xs font-medium text-slate-500 ring-2 ring-white dark:bg-slate-700 dark:ring-surface-dark dark:text-slate-300">
                                +{approvedParticipants.length - 5}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {isOwner ? (
                        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Bạn là chủ sự kiện</p>
                      ) : !isLoggedIn ? (
                        <Link className="mt-4 flex w-full items-center justify-center rounded-lg border border-primary bg-transparent py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10 dark:border-primary dark:hover:bg-primary/20" to="/dang-nhap">
                          Đăng nhập để tham gia
                        </Link>
                      ) : myParticipation?.status === 'pending' ? (
                        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          <span className="material-symbols-outlined text-lg">schedule</span>
                          Đang chờ chủ sự kiện duyệt
                        </div>
                      ) : myParticipation?.status === 'approved' ? (
                        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-sm font-medium text-primary dark:bg-primary/20">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Bạn đã tham gia
                        </div>
                      ) : (
                        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-text-main transition hover:bg-slate-200 dark:border-slate-700 dark:bg-surface-light dark:text-white dark:hover:bg-slate-700 disabled:opacity-60" type="button" onClick={handleJoinEvent} disabled={joinLoading}>
                          {joinLoading ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">person_add</span>}
                          Tham gia sự kiện
                        </button>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>

      {/* Popup Đăng cập nhật phát triển — 3 bước */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={closeUpdateModal}>
          <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-dark ${updateStep === 3 ? 'max-w-2xl' : 'max-w-xl'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-surface-light px-6 py-4 dark:border-slate-700">
              <h3 className="flex items-center gap-2 text-xl font-bold text-text-main dark:text-white">
                <span className="material-symbols-outlined text-primary">add_a_photo</span>
                Đăng cập nhật phát triển
              </h3>
              <button className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" type="button" onClick={closeUpdateModal} aria-label="Đóng">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {/* Stepper */}
            <div className="flex shrink-0 border-b border-slate-100 px-6 py-3 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${updateStep >= 1 ? 'bg-primary text-text-main' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>1</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Địa điểm</span>
                <span className="text-slate-300 dark:text-slate-600">—</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${updateStep >= 2 ? 'bg-primary text-text-main' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>2</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Thông tin</span>
                <span className="text-slate-300 dark:text-slate-600">—</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${updateStep >= 3 ? 'bg-primary text-text-main' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}`}>3</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Vùng xanh</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Bước 1: Chọn địa điểm */}
              {updateStep === 1 && (
                <div className="p-6">
                  {locationsList.length > 0 ? (
                    <>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="update-location">Cập nhật tại địa điểm</label>
                      <select
                        id="update-location"
                        className="select-field mb-4"
                        value={updateLocationIndex}
                        onChange={(e) => setUpdateLocationIndex(Number(e.target.value))}
                      >
                        {locationsList.map((loc, i) => (
                          <option key={i} value={i}>
                            Địa điểm {i + 1}{loc.address ? `: ${loc.address.length > 50 ? loc.address.slice(0, 50) + '…' : loc.address}` : ''}
                          </option>
                        ))}
                      </select>
                      {locationsList[updateLocationIndex]?.lat != null && locationsList[updateLocationIndex]?.lng != null && (
                        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                          <MapContainer
                            center={[locationsList[updateLocationIndex].lat, locationsList[updateLocationIndex].lng]}
                            zoom={14}
                            className="absolute inset-0 h-full w-full rounded-xl pointer-events-none"
                            zoomControl={false}
                            scrollWheelZoom={false}
                            dragging={false}
                          >
                            <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[locationsList[updateLocationIndex].lat, locationsList[updateLocationIndex].lng]} icon={treeIcon} />
                            <SetView center={[locationsList[updateLocationIndex].lat, locationsList[updateLocationIndex].lng]} zoom={14} />
                          </MapContainer>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">Chưa có địa điểm.</p>
                  )}
                  <div className="mt-6 flex justify-end">
                    <button type="button" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-text-main shadow transition hover:bg-primary-hover disabled:opacity-50" onClick={() => setUpdateStep(2)} disabled={locationsList.length === 0}>
                      Tiếp
                    </button>
                  </div>
                </div>
              )}
              {/* Bước 2: Tên cây + ghi chép + ảnh + số liệu + mốc */}
              {updateStep === 2 && (
                <div className="p-6">
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="update-tree-name">Tên cây</label>
                    <input className="input-field" id="update-tree-name" type="text" placeholder="VD: Xoài, Bàng, Sao đen..." value={updateTreeName} onChange={(e) => setUpdateTreeName(e.target.value)} />
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="update-notes">Ghi chép hiện trường</label>
                    <textarea className="textarea-field" id="update-notes" placeholder="Mô tả công việc đã làm (vd: bón phân, tỉa cành)..." rows={3} maxLength={300} value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} />
                    <div className="mt-1 flex justify-end text-xs text-slate-400">{updateNotes.length}/300</div>
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Ảnh minh chứng (tối đa 4 ảnh)</label>
                    <input ref={updateFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpdateImagesChange} />
                    {updateImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {updateImages.map((item, index) => (
                          <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                            <button type="button" className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80" onClick={() => removeUpdateImage(index)} aria-label="Xóa ảnh">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                        {updateImages.length < 4 && (
                          <button type="button" className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600" onClick={() => updateFileInputRef.current?.click()}>
                            <span className="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
                            <span className="text-xs text-slate-500">Thêm</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button type="button" className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-6 dark:border-slate-600" onClick={() => updateFileInputRef.current?.click()}>
                        <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
                        <span className="mt-1 text-sm text-slate-500">Bấm để tải ảnh</span>
                      </button>
                    )}
                  </div>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Chiều cao (cm)</label>
                      <input className="input-field" placeholder="145" type="number" min="0" value={updateHeight} onChange={(e) => setUpdateHeight(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Số cây trồng</label>
                      <input className="input-field" placeholder="20" type="number" min="0" value={updateTreesPlanted} onChange={(e) => setUpdateTreesPlanted(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Tình trạng</label>
                      <select className="select-field" value={updateHealth} onChange={(e) => setUpdateHealth(e.target.value)}>
                        <option value="healthy">Khỏe mạnh</option>
                        <option value="needs-water">Cần tưới nước</option>
                        <option value="pest">Có sâu bệnh</option>
                        <option value="damaged">Bị tổn thương</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                  </div>
                  <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                    <input className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-500" type="checkbox" checked={updateMilestone} onChange={(e) => setUpdateMilestone(e.target.checked)} />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Đánh dấu mốc quan trọng</span>
                  </label>
                  <div className="mt-6 flex justify-between">
                    <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300" onClick={() => setUpdateStep(1)}>Quay lại</button>
                    <button type="button" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-text-main" onClick={() => setUpdateStep(3)}>Tiếp</button>
                  </div>
                </div>
              )}
              {/* Bước 3: Map chọn vùng xanh */}
              {updateStep === 3 && locationsList[updateLocationIndex]?.lat != null && locationsList[updateLocationIndex]?.lng != null && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bấm trên bản đồ để thêm điểm, tối thiểu 3 điểm tạo vùng xanh.</p>
                    {updatePolygonPoints.length > 0 && (
                      <button type="button" className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" onClick={() => setUpdatePolygonPoints([])}>Xóa vùng</button>
                    )}
                  </div>
                  <div className="relative h-[46vh] min-h-[250px] shrink-0">
                    <MapContainer
                      center={[locationsList[updateLocationIndex].lat, locationsList[updateLocationIndex].lng]}
                      zoom={16}
                      className="h-full w-full"
                      scrollWheelZoom
                    >
                      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapClickHandler onPick={({ lat, lng }) => setUpdatePolygonPoints((prev) => [...prev, [lat, lng]])} />
                      {updatePolygonPoints.length >= 3 && <Polygon positions={updatePolygonPoints} pathOptions={GREEN_ZONE_STYLE} />}
                      {updatePolygonPoints.map((pos, i) => (
                        <Marker key={`vertex-${i}`} position={pos} icon={treeIcon} />
                      ))}
                      {treeMarkersInPolygon.map((pos, i) => (
                        <Marker key={`tree-${i}`} position={pos} icon={treeIcon} />
                      ))}
                      {updatePolygonPoints.length === 0 && <SetView center={[locationsList[updateLocationIndex].lat, locationsList[updateLocationIndex].lng]} zoom={16} />}
                    </MapContainer>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-700">
                    <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300" onClick={() => setUpdateStep(2)}>Quay lại</button>
                    <button type="button" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-text-main shadow transition hover:bg-primary-hover disabled:opacity-60" onClick={handlePublishUpdate} disabled={updateSubmitting}>
                      {updateSubmitting ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">publish</span>}
                      Đăng cập nhật
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh timeline */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20" onClick={() => setLightboxImage(null)} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
          <img src={lightboxImage} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Popup danh sách địa điểm (khi > 2 địa điểm) */}
      {showLocationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={() => setShowLocationsModal(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-light px-5 py-4 dark:border-slate-700">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-main dark:text-white">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Danh sách địa điểm
              </h3>
              <button className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" type="button" onClick={() => setShowLocationsModal(false)} aria-label="Đóng">
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

      {/* Popup bản đồ (ấn vào bản đồ trong sidebar) */}
      {showMapModal && mapPositions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={() => setShowMapModal(false)}>
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-dark" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-light px-5 py-4 dark:border-slate-700">
              <h3 className="flex items-center gap-2 text-lg font-bold text-text-main dark:text-white">
                <span className="material-symbols-outlined text-primary">map</span>
                Bản đồ địa điểm
              </h3>
              <button className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" type="button" onClick={() => setShowMapModal(false)} aria-label="Đóng">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <MapContainer
                center={DEFAULT_MAP_CENTER}
                zoom={DEFAULT_MAP_ZOOM}
                className="h-full w-full rounded-b-2xl"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
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
      </div>
    </MainLayout>
  )
}

export default EventDetailPage
