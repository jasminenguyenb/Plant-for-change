import { useEffect, useMemo, useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'

// Fix icon marker mặc định của Leaflet (lỗi khi build)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Icon cây cho marker sự kiện (nền tròn xanh + SVG cây)
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

// Loại cây (value + icon; label lấy từ i18n)
const TREE_FILTERS = [
  { value: 'fruit', icon: 'nutrition' },
  { value: 'shade', icon: 'umbrella' },
  { value: 'native', icon: 'local_florist' },
  { value: 'evergreen', icon: 'psychiatry' },
  { value: 'flowering', icon: 'eco' },
]

function formatEventDateForMap(dateValue, locale = 'vi') {
  if (!dateValue) return '—'
  try {
    const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
    if (Number.isNaN(d.getTime())) return '—'
    const localeStr = locale === 'vi' ? 'vi-VN' : 'en-US'
    return d.toLocaleDateString(localeStr, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

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
    } catch (_) {
      // ignore invalid bounds
    }
  }, [map, positions])
  return null
}

function MapControls({ t }) {
  const map = useMap()
  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-md transition hover:bg-slate-50 dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-slate-700"
        onClick={() => map.locate({ setView: true, maxZoom: 16 })}
        title={t('mapPage.myLocation')}
        type="button"
      >
        <span className="material-symbols-outlined">my_location</span>
      </button>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-md transition hover:bg-slate-50 dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-slate-700"
        onClick={() => map.zoomIn()}
        title={t('mapPage.zoomIn')}
        type="button"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-md transition hover:bg-slate-50 dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-slate-700"
        onClick={() => map.zoomOut()}
        title={t('mapPage.zoomOut')}
        type="button"
      >
        <span className="material-symbols-outlined">remove</span>
      </button>
    </div>
  )
}

function MapPage() {
  const { locale, t } = useLanguage()
  const [mapEvents, setMapEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState(null) // null = tất cả, hoặc 'fruit' | 'shade' | ...
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile: drawer đóng mở
  const [filterOpen, setFilterOpen] = useState(false) // bộ lọc loại cây: gọn lại, bấm mới mở
  const [selectedEventId, setSelectedEventId] = useState(null) // ấn card → show vùng xanh sự kiện đó
  const [selectedEventGreenZones, setSelectedEventGreenZones] = useState([]) // { polygon, treePositions }[]
  const [greenZonesLoading, setGreenZonesLoading] = useState(false)

  const treeFilterLabel = (value) => t(`mapPage.tree${value.charAt(0).toUpperCase() + value.slice(1)}`)

  useEffect(() => {
    // Hiển thị tất cả event đã duyệt, không lọc theo tài khoản đăng nhập
    const q = query(
      collection(db, 'events'),
      where('status', '==', 'approved')
    )
    getDocs(q)
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => e.location?.lat != null && e.location?.lng != null)
          .map((e) => ({
            id: e.id,
            title: e.title || null,
            date: e.date,
            address: e.location?.address || null,
            position: [e.location.lat, e.location.lng],
            image: e.coverImageUrl || '',
            treeCategory: e.treeCategory || null,
          }))
        setMapEvents(list)
      })
      .catch(() => setMapEvents([]))
      .finally(() => setEventsLoading(false))
  }, [])

  const displayedEvents = useMemo(() => {
    if (!filterCategory) return mapEvents
    return mapEvents.filter((e) => e.treeCategory === filterCategory)
  }, [mapEvents, filterCategory])

  // Khi chọn sự kiện → tải updates có polygon (vùng xanh) của sự kiện đó (không dùng orderBy để tránh lỗi index)
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventGreenZones([])
      return
    }
    setGreenZonesLoading(true)
    getDocs(collection(db, 'events', selectedEventId, 'updates'))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => {
          const ta = a.createdAt?.toDate?.()?.getTime() ?? 0
          const tb = b.createdAt?.toDate?.()?.getTime() ?? 0
          return tb - ta
        })
        const zones = list
          .filter((u) => u.polygon && Array.isArray(u.polygon) && u.polygon.length >= 3)
          .map((u) => ({
            polygon: u.polygon.map((p) => [p.lat, p.lng]),
            treePositions: (u.treePositions && Array.isArray(u.treePositions))
              ? u.treePositions.map((p) => [p.lat, p.lng])
              : [],
          }))
        setSelectedEventGreenZones(zones)
      })
      .catch(() => setSelectedEventGreenZones([]))
      .finally(() => setGreenZonesLoading(false))
  }, [selectedEventId])

  const selectedEvent = useMemo(
    () => (selectedEventId ? displayedEvents.find((e) => e.id === selectedEventId) : null),
    [selectedEventId, displayedEvents]
  )
  const fitBoundsPositions = useMemo(() => {
    if (!selectedEvent && selectedEventGreenZones.length === 0) return null
    const fromZones = selectedEventGreenZones.flatMap((z) => [...z.polygon, ...z.treePositions])
    if (selectedEvent?.position) return [...[selectedEvent.position], ...fromZones]
    return fromZones.length > 0 ? fromZones : null
  }, [selectedEvent, selectedEventGreenZones])

  return (
    <MainLayout>
      <PageCoverHero
        size="compact"
        title={t('mapPage.heroTitle')}
        subtitle={t('mapPage.heroSubtitle')}
      />
      <div className="relative flex h-full min-h-0 flex-1 overflow-hidden font-display text-text-main min-h-[calc(100vh-20rem)] md:min-h-[calc(100vh-17rem)]">
        {/* Backdrop mobile: đóng sidebar khi bấm bên ngoài */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label={t('mapPage.closeSidebar')}
            className="fixed inset-0 z-[18] bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar: mobile = drawer (ẩn mặc định), md+ = luôn hiện */}
        <aside
          className={`absolute left-0 top-0 z-20 flex h-full w-full max-w-[360px] flex-col border-r border-surface-light bg-white shadow-xl transition-transform duration-300 ease-out dark:border-surface-dark dark:bg-background-dark md:relative md:max-w-none md:translate-x-0 md:w-[400px] md:shadow-none lg:w-[450px] ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="z-10 space-y-4 border-b border-surface-light bg-white p-6 dark:border-surface-dark dark:bg-background-dark">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white py-3 pl-3 pr-4 text-base shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_rgba(43,238,108,0.18)] dark:border-slate-600 dark:bg-black/25 focus-within:dark:border-[var(--color-primary)] focus-within:dark:shadow-[0_0_0_3px_rgba(43,238,108,0.25)] md:pl-4">
              <span className="material-symbols-outlined shrink-0 text-xl text-slate-400" aria-hidden>search</span>
              <input
                className="min-w-0 flex-1 border-none bg-transparent py-0 text-text-main outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-200 dark:placeholder:text-slate-500"
                placeholder={t('mapPage.searchPlaceholder')}
                type="text"
              />
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilterCategory(null)}
                className={`flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  filterCategory === null
                    ? 'bg-primary text-text-main'
                    : 'border border-slate-200 bg-surface-light text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-surface-dark dark:text-slate-300 dark:hover:bg-surface-dark/80'
                }`}
              >
                {t('mapPage.allEvents')}
              </button>
            </div>
            {/* Bộ lọc loại cây: gọn lại, bấm mới mở */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg py-1.5 pr-1 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                aria-expanded={filterOpen}
              >
                <span>{t('mapPage.filterLabel')}</span>
                <span className="material-symbols-outlined text-lg text-slate-400">{filterOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {filterOpen && (
                <div className="animate-fade-in flex flex-col gap-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('mapPage.treeTypeLabel')}</span>
                  </div>
                  <div className="no-scrollbar flex flex-wrap gap-2 overflow-x-auto pb-2">
                    {TREE_FILTERS.map(({ value, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilterCategory((prev) => (prev === value ? null : value))}
                        className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          filterCategory === value
                            ? 'border-primary bg-primary/20 text-forest dark:border-primary dark:bg-primary/20 dark:text-primary'
                            : 'border-primary/25 bg-surface-light text-forest hover:bg-primary/10 dark:border-forest/40 dark:bg-surface-dark dark:text-primary dark:hover:bg-forest/25'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                        {treeFilterLabel(value)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t('mapPage.showingCount')} {displayedEvents.length} {t('mapPage.eventsUnit')}</span>
                    <button
                      type="button"
                      onClick={() => setFilterCategory(null)}
                      className="text-primary hover:underline"
                    >
                      {t('mapPage.resetFilter')}
                    </button>
                  </div>
                </div>
              )}
            </div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 md:hidden"
                aria-label={t('mapPage.closeEventList')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="sidebar-scroll flex-1 space-y-4 overflow-y-auto bg-background-light p-4 dark:bg-[#0c1a11]">
            {eventsLoading ? (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              </div>
            ) : displayedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 py-12 text-center dark:border-slate-600 dark:bg-surface-dark/30">
                <span className="material-symbols-outlined text-4xl text-slate-400">event_note</span>
                <p className="mt-2 font-medium text-slate-600 dark:text-slate-400">
                  {filterCategory ? t('mapPage.noEventsInCategory') : t('mapPage.noEventsYet')}
                </p>
                <p className="mt-1 text-sm text-slate-500">{t('mapPage.noEventsHint')}</p>
              </div>
            ) : (
              displayedEvents.map((event, index) => {
                const isSelected = selectedEventId === event.id
                return (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEventId(isSelected ? null : event.id) } }}
                    className={`group flex cursor-pointer flex-col gap-3 rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-surface-dark ${isSelected ? 'ring-2 ring-primary border-primary' : index === 0 ? 'border-l-4 border-primary' : 'border border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-lg">
                      {event.image ? (
                        <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={event.image} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/20">
                          <span className="material-symbols-outlined text-4xl text-primary">forest</span>
                        </div>
                      )}
                      <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                        {formatEventDateForMap(event.date, locale)}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-text-main">Đang xem vùng xanh</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Link className="text-base font-bold text-text-main hover:text-primary dark:text-white md:text-lg" to={`/su-kien/${event.id}`} onClick={(e) => e.stopPropagation()}>
                        {event.title || t('mapPage.eventDefaultTitle')}
                      </Link>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {event.address || t('mapPage.noAddress')}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('mapPage.approvedEvent')}</div>
                      <Link className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-text-main transition hover:bg-opacity-90" to={`/su-kien/${event.id}`} onClick={(e) => e.stopPropagation()}>
                        {t('mapPage.viewDetails')}
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Bản đồ thật - Leaflet + OpenStreetMap (cần height rõ ràng để Leaflet render) */}
        <main className="relative w-full flex-1 overflow-hidden map-bg min-h-[320px] h-[calc(100vh-14rem)] md:min-h-[420px]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 md:hidden"
            aria-label={t('mapPage.openEventList')}
          >
            <span className="material-symbols-outlined">list</span>
            {t('mapPage.eventList')}
          </button>
          <div className="map-page-map-wrapper absolute inset-0 z-0 min-h-[250px]">
            <MapContainer
              center={[10.8231, 106.6297]}
              className="h-full w-full"
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', minHeight: 280 }}
              zoom={12}
            >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapControls t={t} />
            {fitBoundsPositions && fitBoundsPositions.length > 0 && (
              <FitBounds positions={fitBoundsPositions} />
            )}
            {displayedEvents.map((event) => (
              <Marker key={event.id} position={event.position} icon={treeIcon}>
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex gap-3">
                      {event.image ? (
                        <img alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" src={event.image} />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
                          <span className="material-symbols-outlined text-2xl text-primary">forest</span>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{event.title || t('mapPage.eventDefaultTitle')}</h4>
                        <p className="text-xs text-gray-500">{formatEventDateForMap(event.date, locale)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{event.address || t('mapPage.noAddress')}</p>
                        <Link className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline" to={`/su-kien/${event.id}`}>
                          {t('mapPage.viewDetails')}
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {selectedEventId && selectedEventGreenZones.map((zone, idx) => (
              <Fragment key={idx}>
                <Polygon positions={zone.polygon} pathOptions={GREEN_ZONE_STYLE} />
                {zone.treePositions.map((pos, i) => (
                  <Marker key={`${idx}-${i}`} position={pos} icon={treeIcon} />
                ))}
              </Fragment>
            ))}
          </MapContainer>
          </div>
        </main>
      </div>
    </MainLayout>
  )
}

export default MapPage
