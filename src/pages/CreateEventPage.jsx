import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MainLayout } from '../layouts/MainLayout'
import { PageCoverHero } from '../components/PageCoverHero'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase'
import { useAuth } from '../contexts/AuthContext'
import { autocomplete, placeDetail } from '../services/goong'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Icon cây cho marker địa điểm (dùng chung với MapPage)
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

const DEFAULT_CENTER = [21.0, 105.85]
const DEFAULT_ZOOM = 6

function FlyTo({ center, zoom = 16 }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.flyTo(center, zoom, { duration: 0.8 })
    }
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

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

const COVER_MAX_SIZE_MB = 10

function CreateEventPage() {
  const { id: eventId } = useParams()
  const isEditMode = Boolean(eventId)
  const { user, isLoggedIn, loading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)

  const [editLoadLoading, setEditLoadLoading] = useState(isEditMode)
  const [existingCoverUrl, setExistingCoverUrl] = useState('')
  const [eventStatus, setEventStatus] = useState('draft') // status khi chỉnh sửa (giữ nguyên từ event)
  const [eventName, setEventName] = useState('')
  const [treeCategory, setTreeCategory] = useState('')
  const [targetTrees, setTargetTrees] = useState('')
  const [targetVolunteers, setTargetVolunteers] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Nhiều địa điểm: mỗi item { id, address, lat, lng, date }
  const [locations, setLocations] = useState(() => [{ id: Date.now(), address: '', lat: null, lng: null, date: '' }])
  const [editingAddressIndex, setEditingAddressIndex] = useState(null) // card đang gõ địa chỉ (cho autocomplete)
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0) // card đang chọn vị trí trên map
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [modalAddressInput, setModalAddressInput] = useState('')
  const [modalSuggestions, setModalSuggestions] = useState([])
  const [modalSuggestionsLoading, setModalSuggestionsLoading] = useState(false)
  const [modalShowDropdown, setModalShowDropdown] = useState(false)
  const [rightTab, setRightTab] = useState('location')
  const dropdownRef = useRef(null)
  const modalDropdownRef = useRef(null)

  const debouncedInput = useDebounce(editingAddressIndex !== null ? (locations[editingAddressIndex]?.address ?? '') : '', 350)
  const modalDebouncedInput = useDebounce(modalAddressInput, 350)

  // Gọi Autocomplete khi user gõ (đã debounce)
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    let cancelled = false
    setSuggestionsLoading(true)
    autocomplete(debouncedInput, { limit: 6 })
      .then(({ predictions }) => {
        if (!cancelled) {
          setSuggestions(predictions || [])
          setShowDropdown(true)
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false)
      })
    return () => { cancelled = true }
  }, [debouncedInput])

  // Autocomplete cho modal (chỉ khi modal mở)
  useEffect(() => {
    if (!showMapModal || !modalDebouncedInput.trim()) {
      setModalSuggestions([])
      setModalShowDropdown(false)
      return
    }
    let cancelled = false
    setModalSuggestionsLoading(true)
    autocomplete(modalDebouncedInput, { limit: 6 })
      .then(({ predictions }) => {
        if (!cancelled) {
          setModalSuggestions(predictions || [])
          setModalShowDropdown(true)
        }
      })
      .catch(() => {
        if (!cancelled) setModalSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setModalSuggestionsLoading(false)
      })
    return () => { cancelled = true }
  }, [showMapModal, modalDebouncedInput])

  // Khi mở modal bản đồ, đồng bộ ô tìm kiếm với địa chỉ địa điểm đang chọn
  useEffect(() => {
    if (showMapModal) setModalAddressInput(locations[selectedLocationIndex]?.address ?? '')
  }, [showMapModal])

  // Khởi tạo nội dung editor từ description (khi load nháp về sau)
  useEffect(() => {
    if (editorRef.current && description === '' && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = ''
    }
  }, [])

  // Click ngoài dropdown thì đóng
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (modalDropdownRef.current && !modalDropdownRef.current.contains(e.target)) {
        setModalShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Chế độ chỉnh sửa: load sự kiện và kiểm tra quyền
  useEffect(() => {
    if (!isEditMode || !eventId || !user) {
      if (isEditMode && !eventId) setEditLoadLoading(false)
      return
    }
    setEditLoadLoading(true)
    getDoc(doc(db, 'events', eventId))
      .then((snap) => {
        if (!snap.exists()) {
          navigate('/', { replace: true })
          return
        }
        const data = snap.data()
        if (data.createdBy !== user.uid) {
          navigate(`/su-kien/${eventId}`, { replace: true })
          return
        }
        setEventName(data.title || '')
        setTreeCategory(data.treeCategory || '')
        setTargetTrees(data.targetTrees != null ? String(data.targetTrees) : '')
        setTargetVolunteers(data.targetVolunteers != null ? String(data.targetVolunteers) : '')
        setDescription(data.description || '')
        setExistingCoverUrl(data.coverImageUrl || '')
        setCoverPreviewUrl(data.coverImageUrl || '')
        setEventStatus(data.status || 'draft')
        if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(
            data.locations.map((loc, i) => ({
              id: Date.now() + i,
              address: loc.address ?? '',
              lat: loc.lat ?? null,
              lng: loc.lng ?? null,
              date: loc.date ?? '',
            }))
          )
        } else if (data.location?.address != null || data.location?.lat != null) {
          setLocations([
            {
              id: Date.now(),
              address: data.location?.address ?? '',
              lat: data.location?.lat ?? null,
              lng: data.location?.lng ?? null,
              date: data.date ?? '',
            },
          ])
        }
      })
      .catch(() => navigate('/', { replace: true }))
      .finally(() => setEditLoadLoading(false))
  }, [isEditMode, eventId, user, navigate])

  const onSelectSuggestion = useCallback(async (prediction, index) => {
    setShowDropdown(false)
    setSuggestions([])
    setSuggestionsLoading(true)
    const idx = index ?? editingAddressIndex
    if (idx == null) return
    try {
      const { result, status } = await placeDetail(prediction.place_id)
      const address = result?.formatted_address || prediction.description
      const lat = status === 'OK' && result?.geometry?.location ? result.geometry.location.lat : null
      const lng = status === 'OK' && result?.geometry?.location ? result.geometry.location.lng : null
      setLocations((prev) => prev.map((loc, j) => (j === idx ? { ...loc, address, lat, lng } : loc)))
    } catch {
      setLocations((prev) => prev.map((loc, j) => (j === idx ? { ...loc, address: prediction.description, lat: null, lng: null } : loc)))
    } finally {
      setSuggestionsLoading(false)
      setEditingAddressIndex(null)
    }
  }, [editingAddressIndex])

  const onSelectSuggestionModal = useCallback(async (prediction) => {
    setModalShowDropdown(false)
    setModalSuggestions([])
    setModalSuggestionsLoading(true)
    const idx = selectedLocationIndex
    try {
      const { result, status } = await placeDetail(prediction.place_id)
      const address = result?.formatted_address || prediction.description
      const lat = status === 'OK' && result?.geometry?.location ? result.geometry.location.lat : null
      const lng = status === 'OK' && result?.geometry?.location ? result.geometry.location.lng : null
      setModalAddressInput(address)
      setLocations((prev) => prev.map((loc, j) => (j === idx ? { ...loc, address, lat, lng } : loc)))
    } catch {
      setModalAddressInput(prediction.description)
      setLocations((prev) => prev.map((loc, j) => (j === idx ? { ...loc, address: prediction.description, lat: null, lng: null } : loc)))
    } finally {
      setModalSuggestionsLoading(false)
    }
  }, [selectedLocationIndex])

  const handleCoverChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > COVER_MAX_SIZE_MB * 1024 * 1024) {
      setSubmitError(t('createEvent.errorCoverMax'))
      return
    }
    setSubmitError('')
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
  }, [t])

  const clearCover = useCallback(() => {
    setCoverFile(null)
    if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl('')
    if (isEditMode) setExistingCoverUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [coverPreviewUrl, isEditMode])

  const saveEvent = useCallback(async (status) => {
    if (!user) return
    const validLocations = locations.filter(
      (loc) => (loc.address?.trim() || (loc.lat != null && loc.lng != null)) && loc.date?.trim()
    )
    if (status === 'pending') {
      if (!eventName.trim()) {
        setSubmitError(t('createEvent.errorNameRequired'))
        return
      }
      if (validLocations.length === 0) {
        setSubmitError(t('createEvent.atLeastOneLocationRequired'))
        return
      }
    }
    setSubmitError('')
    setSubmitLoading(true)
    try {
      let coverImageUrl = isEditMode ? existingCoverUrl : ''
      if (coverFile) {
        const ext = coverFile.name.split('.').pop() || 'jpg'
        const path = `events/${user.uid}/${Date.now()}_cover.${ext}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, coverFile)
        coverImageUrl = await getDownloadURL(storageRef)
      }
      const locationsPayload = locations.map((loc) => ({
        address: loc.address?.trim() || null,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
        date: loc.date?.trim() || null,
      }))
      const first = validLocations[0] || locations[0]
      const payload = {
        title: (eventName || '').trim() || null,
        date: first?.date || null,
        treeCategory: treeCategory || null,
        targetTrees: targetTrees.trim() ? (parseInt(targetTrees, 10) || null) : null,
        targetVolunteers: targetVolunteers.trim() ? (parseInt(targetVolunteers, 10) || null) : null,
        description: (description || '').trim() || null,
        coverImageUrl: coverImageUrl || null,
        location: {
          address: first?.address?.trim() || null,
          lat: first?.lat ?? null,
          lng: first?.lng ?? null,
        },
        locations: locationsPayload,
        status: status || 'draft',
        updatedAt: serverTimestamp(),
      }
      if (isEditMode && eventId) {
        await updateDoc(doc(db, 'events', eventId), payload)
        navigate(`/su-kien/${eventId}`, { state: { message: 'Đã cập nhật sự kiện.' } })
      } else {
        payload.createdBy = user.uid
        payload.createdByEmail = user.email || null
        payload.createdAt = serverTimestamp()
        await addDoc(collection(db, 'events'), payload)
        if (status === 'pending') {
          navigate('/tai-khoan', { state: { message: t('createEvent.successSubmitted') } })
        } else {
          navigate('/tai-khoan', { state: { message: t('createEvent.successDraftSaved') } })
        }
      }
    } catch (err) {
      console.error('CreateEvent save error:', err)
      setSubmitError(err.message || t('createEvent.errorSaveFailed'))
    } finally {
      setSubmitLoading(false)
    }
  }, [user, eventName, treeCategory, targetTrees, targetVolunteers, description, coverFile, locations, navigate, t, isEditMode, eventId, existingCoverUrl])

  const handlePublish = () => saveEvent('pending')
  const handleDraft = () => saveEvent('draft')

  const applyFormat = (command, value = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  const handleLink = () => {
    const url = window.prompt(t('createEvent.promptLink'), 'https://')
    if (url) applyFormat('createLink', url)
  }

  if (loading || (isEditMode && editLoadLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }
  if (!isLoggedIn) {
    return <Navigate to="/dang-nhap" replace />
  }

  return (
    <MainLayout>
      <PageCoverHero
        size="compact"
        title={isEditMode ? t('createEvent.editTitle') : t('createEvent.title')}
        subtitle={isEditMode ? t('createEvent.editSubtitle') : t('createEvent.subtitle')}
      />
      <div className="flex flex-1 flex-col items-center font-display text-text-main">
        <div className="w-full max-w-[1200px] px-4 py-3.5 md:px-6 md:py-5 lg:px-4 lg:py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {/* Cột trái (desktop): Thông tin cơ bản + Mẹo + nút đăng. Mobile: dùng order để hiển thị Step 1 → Step 2,3 → Mẹo → Nút */}
              <div className="contents lg:flex lg:flex-col lg:gap-4">
                {/* Bước 1: Thông tin cơ bản */}
                <div className="order-1 rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark lg:order-none lg:p-5 md:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-text-main">1</div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">{t('createEvent.step1')}</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-main dark:text-slate-200" htmlFor="event-name">{t('createEvent.eventName')}</label>
                      <input
                        className="input-field"
                        id="event-name"
                        placeholder={t('createEvent.eventNamePlaceholder')}
                        type="text"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-main dark:text-slate-200" htmlFor="tree-category">{t('createEvent.treeCategory')}</label>
                        <select
                          className="select-field"
                          id="tree-category"
                          value={treeCategory}
                          onChange={(e) => setTreeCategory(e.target.value)}
                        >
                          <option value="">{t('createEvent.treeCategoryPlaceholder')}</option>
                          <option value="fruit">{t('createEvent.treeFruit')}</option>
                          <option value="shade">{t('createEvent.treeShade')}</option>
                          <option value="native">{t('createEvent.treeNative')}</option>
                          <option value="evergreen">{t('createEvent.treeEvergreen')}</option>
                          <option value="flowering">{t('createEvent.treeFlowering')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-text-main dark:text-slate-200" htmlFor="target-trees">{t('createEvent.targetTrees')}</label>
                        <input
                          className="input-field"
                          id="target-trees"
                          type="number"
                          min="1"
                          placeholder={t('createEvent.targetTreesPlaceholder')}
                          value={targetTrees}
                          onChange={(e) => setTargetTrees(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-text-main dark:text-slate-200" htmlFor="target-volunteers">{t('createEvent.targetVolunteers')}</label>
                        <input
                          className="input-field"
                          id="target-volunteers"
                          type="number"
                          min="1"
                          placeholder={t('createEvent.targetVolunteersPlaceholder')}
                          value={targetVolunteers}
                          onChange={(e) => setTargetVolunteers(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mẹo nhanh - cột trái */}
                <div className="order-4 rounded-xl border border-primary/20 bg-surface-light p-6 dark:bg-surface-dark/50 lg:order-none lg:p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-main dark:text-white">
                    <span className="material-symbols-outlined text-primary">lightbulb</span>
                    {t('createEvent.tipsTitle')}
                  </h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary">check_circle</span>
                      <span>{t('createEvent.tip1')}</span>
                    </li>
                    <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary">check_circle</span>
                      <span>{t('createEvent.tip2')}</span>
                    </li>
                    <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary">check_circle</span>
                      <span>{t('createEvent.tip3')}</span>
                    </li>
                  </ul>
                </div>

                {/* Nút đăng / Lưu nháp / Cập nhật / Hủy - cột trái */}
                <div className="order-5 rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark lg:order-none lg:p-5">
                  {submitError && (
                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{submitError}</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {isEditMode ? (
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-text-main shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                        type="button"
                        onClick={() => saveEvent(eventStatus || 'draft')}
                        disabled={submitLoading}
                      >
                        {submitLoading ? (
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined">save</span>
                        )}
                        Cập nhật sự kiện
                      </button>
                    ) : (
                      <>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-text-main shadow-sm transition hover:bg-primary-hover disabled:opacity-60"
                          type="button"
                          onClick={handlePublish}
                          disabled={submitLoading}
                        >
                          {submitLoading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined">rocket_launch</span>
                          )}
                          {t('createEvent.publish')}
                        </button>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          type="button"
                          onClick={handleDraft}
                          disabled={submitLoading}
                        >
                          {submitLoading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined">save</span>
                          )}
                          {t('createEvent.saveDraft')}
                        </button>
                      </>
                    )}
                    <Link
                      className="flex w-full items-center justify-center gap-2 px-4 py-2 font-medium text-slate-500 transition hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
                      to={isEditMode ? `/su-kien/${eventId}` : '/'}
                    >
                      {t('createEvent.cancel')}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Cột phải (desktop): Tab Địa điểm | Ảnh bìa & mô tả. Mobile: order-2 để nằm giữa Step 1 và Mẹo/Nút */}
              <div className="order-2 space-y-6 lg:order-none">
                {/* Tab bar - chỉ desktop */}
                <div className="hidden border-b border-slate-200 pb-3 dark:border-slate-700 lg:flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRightTab('location')}
                    className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${rightTab === 'location' ? 'bg-primary text-text-main' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    {t('createEvent.tabLocation')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab('cover')}
                    className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${rightTab === 'cover' ? 'bg-primary text-text-main' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    {t('createEvent.tabCoverDesc')}
                  </button>
                </div>

                {/* Bước 2: Nhiều địa điểm & thời gian */}
                <div className={rightTab === 'cover' ? 'lg:hidden' : ''}>
                  <div className="rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark lg:p-5 md:p-6">
                    <div className="mb-6 flex items-center gap-3 lg:mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">2</div>
                      <h3 className="text-lg font-bold text-text-main dark:text-white">{t('createEvent.step2')}</h3>
                    </div>
                    <div className="space-y-6">
                      {locations.map((loc, i) => (
                        <div key={loc.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/30">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('createEvent.locationNumber')} {i + 1}</span>
                            {locations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLocations((prev) => prev.filter((_, j) => j !== i))
                                  setSelectedLocationIndex((prev) => {
                                    if (prev === i) return 0
                                    if (prev > i) return prev - 1
                                    return prev
                                  })
                                  setEditingAddressIndex((prev) => {
                                    if (prev === i) return null
                                    if (prev != null && prev > i) return prev - 1
                                    return prev
                                  })
                                }}
                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                              >
                                {t('createEvent.removeLocation')}
                              </button>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="relative flex items-center gap-1" ref={editingAddressIndex === i ? dropdownRef : null}>
                              <div className="relative flex-1">
                                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                  className="input-field !pl-11 !pr-11"
                                  placeholder={t('createEvent.addressPlaceholder')}
                                  type="text"
                                  value={loc.address}
                                  onChange={(e) => setLocations((prev) => prev.map((l, j) => (j === i ? { ...l, address: e.target.value } : l)))}
                                  onFocus={() => setEditingAddressIndex(i)}
                                  autoComplete="off"
                                />
                                {editingAddressIndex === i && suggestionsLoading && (
                                  <span className="material-symbols-outlined absolute right-11 top-1/2 -translate-y-1/2 text-slate-400 animate-pulse">progress_activity</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => { setSelectedLocationIndex(i); setShowMapModal(true); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-200 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-forest"
                                  title={t('createEvent.pickOnMap')}
                                  aria-label={t('createEvent.pickOnMap')}
                                >
                                  <span className="material-symbols-outlined text-xl">map</span>
                                </button>
                              </div>
                              {editingAddressIndex === i && showDropdown && suggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-surface-dark">
                                  {suggestions.map((p) => (
                                    <li key={p.place_id}>
                                      <button
                                        className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-text-main hover:bg-surface-light dark:hover:bg-slate-700 dark:text-slate-200"
                                        type="button"
                                        onClick={() => onSelectSuggestion(p, i)}
                                      >
                                        <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary">location_on</span>
                                        <span>
                                          {p.structured_formatting?.main_text && (
                                            <>
                                              <strong>{p.structured_formatting.main_text}</strong>
                                              {p.structured_formatting.secondary_text && (
                                                <span className="text-slate-500 dark:text-slate-400"> — {p.structured_formatting.secondary_text}</span>
                                              )}
                                            </>
                                          )}
                                          {!p.structured_formatting?.main_text && p.description}
                                        </span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {loc.address && (
                              <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                                {loc.lat != null && loc.lng != null && (
                                  <span className="text-slate-500">({loc.lat.toFixed(5)}, {loc.lng.toFixed(5)})</span>
                                )}
                              </p>
                            )}
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('createEvent.dateTimeForLocation')}</label>
                              <input
                                className="input-field"
                                type="datetime-local"
                                value={loc.date}
                                onChange={(e) => setLocations((prev) => prev.map((l, j) => (j === i ? { ...l, date: e.target.value } : l)))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setLocations((prev) => [...prev, { id: Date.now(), address: '', lat: null, lng: null, date: '' }])}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-primary hover:bg-surface-light/50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-primary dark:hover:bg-slate-800/50"
                      >
                        <span className="material-symbols-outlined">add</span>
                        {t('createEvent.addLocation')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bước 3: Ảnh bìa & mô tả - mobile: luôn hiện; desktop: hiện khi tab Ảnh bìa & mô tả */}
                <div className={rightTab === 'location' ? 'lg:hidden' : ''}>
                <div className="rounded-xl border border-surface-light bg-white p-6 shadow-sm dark:border-surface-dark dark:bg-surface-dark lg:p-5 md:p-6">
                  <div className="mb-6 flex items-center gap-3 lg:mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-light text-sm font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">3</div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">{t('createEvent.step3')}</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-text-main dark:text-slate-200">{t('createEvent.coverImage')}</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif"
                        className="hidden"
                        onChange={handleCoverChange}
                      />
                      {coverPreviewUrl ? (
                        <div className="relative inline-block">
                          <img src={coverPreviewUrl} alt="Preview" className="max-h-48 rounded-lg border border-slate-200 object-cover dark:border-slate-600" />
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                            onClick={clearCover}
                            aria-label={t('createEvent.removeImage')}
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex cursor-pointer justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 transition hover:bg-surface-light/50 dark:border-slate-600 dark:hover:bg-slate-800/50"
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="text-center">
                            <span className="material-symbols-outlined mx-auto h-12 w-12 text-slate-400">add_photo_alternate</span>
                            <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400">
                              <span className="cursor-pointer rounded-md bg-transparent font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary-hover">
                                {t('createEvent.uploadImage')}
                              </span>
                              <p className="pl-1">{t('createEvent.orDragDrop')}</p>
                            </div>
                            <p className="text-xs leading-5 text-slate-500">{t('createEvent.imageFormat')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-text-main dark:text-slate-200">{t('createEvent.eventDetails')}</label>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-black/20">
                        <div className="flex items-center gap-1 border-b border-slate-300 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800/50">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                            onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                            title={t('createEvent.toolbarBold')}
                          >
                            <span className="material-symbols-outlined text-sm">format_bold</span>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                            onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
                            title={t('createEvent.toolbarItalic')}
                          >
                            <span className="material-symbols-outlined text-sm">format_italic</span>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                            onMouseDown={(e) => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
                            title={t('createEvent.toolbarList')}
                          >
                            <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                            onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
                            title={t('createEvent.toolbarLink')}
                          >
                            <span className="material-symbols-outlined text-sm">link</span>
                          </button>
                        </div>
                        <div
                          ref={editorRef}
                          contentEditable
                          className="min-h-[160px] w-full border-0 bg-transparent p-4 text-text-main outline-none focus:ring-0 dark:text-white [&:empty::before]:cursor-text [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-slate-400"
                          data-placeholder={t('createEvent.eventDetailsPlaceholder')}
                          onInput={() => setDescription(editorRef.current?.innerHTML ?? '')}
                          suppressContentEditableWarning
                        />
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Modal bản đồ chọn vị trí */}
              {showMapModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMapModal(false)}>
                  <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl dark:bg-surface-dark" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <h3 className="text-lg font-bold text-text-main dark:text-white">{t('createEvent.modalMapTitle')}</h3>
                      <button
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        type="button"
                        onClick={() => setShowMapModal(false)}
                        aria-label={t('createEvent.modalClose')}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div className="relative" ref={modalDropdownRef}>
                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                          className="input-field !pl-11 pr-10"
                          placeholder={t('createEvent.addressPlaceholder')}
                          type="text"
                          value={modalAddressInput}
                          onChange={(e) => setModalAddressInput(e.target.value)}
                          onFocus={() => modalSuggestions.length > 0 && setModalShowDropdown(true)}
                          autoComplete="off"
                        />
                        {modalSuggestionsLoading && (
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-pulse">progress_activity</span>
                        )}
                        {modalShowDropdown && modalSuggestions.length > 0 && (
                          <ul className="absolute left-0 right-0 top-full z-[10000] mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-surface-dark">
                            {modalSuggestions.map((p) => (
                              <li key={p.place_id}>
                                <button
                                  className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-text-main hover:bg-surface-light dark:hover:bg-slate-700 dark:text-slate-200"
                                  type="button"
                                  onClick={() => onSelectSuggestionModal(p)}
                                >
                                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-base text-primary">location_on</span>
                                  <span>
                                    {p.structured_formatting?.main_text ? (
                                      <>
                                        <strong>{p.structured_formatting.main_text}</strong>
                                        {p.structured_formatting.secondary_text && (
                                          <span className="text-slate-500 dark:text-slate-400"> — {p.structured_formatting.secondary_text}</span>
                                        )}
                                      </>
                                    ) : (
                                      p.description
                                    )}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-xl">
                      <MapContainer
                        center={
                          locations[selectedLocationIndex]?.lat != null
                            ? [locations[selectedLocationIndex].lat, locations[selectedLocationIndex].lng]
                            : DEFAULT_CENTER
                        }
                        zoom={locations[selectedLocationIndex]?.lat != null ? 16 : DEFAULT_ZOOM}
                        className="h-full w-full rounded-b-xl"
                        scrollWheelZoom
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {locations[selectedLocationIndex]?.lat != null && (
                          <Marker
                            position={[locations[selectedLocationIndex].lat, locations[selectedLocationIndex].lng]}
                            icon={treeIcon}
                          />
                        )}
                        <MapClickHandler
                          onPick={({ lat, lng }) => {
                            setLocations((prev) =>
                              prev.map((loc, j) => (j === selectedLocationIndex ? { ...loc, lat, lng } : loc))
                            )
                          }}
                        />
                        {locations[selectedLocationIndex]?.lat != null && (
                          <FlyTo
                            center={[locations[selectedLocationIndex].lat, locations[selectedLocationIndex].lng]}
                          />
                        )}
                      </MapContainer>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
                      <button
                        className="rounded-lg bg-primary px-4 py-2 font-medium text-text-main transition hover:bg-primary/90"
                        type="button"
                        onClick={() => setShowMapModal(false)}
                      >
                        {t('createEvent.modalDone')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </MainLayout>
  )
}

export default CreateEventPage
