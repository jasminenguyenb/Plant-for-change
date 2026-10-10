import logoSrc from '../assets/lg.png'

export function Logo({ className = 'h-8 w-8', alt = 'Plant for Change', ...props }) {
  return <img src={logoSrc} alt={alt} className={className} {...props} />
}
