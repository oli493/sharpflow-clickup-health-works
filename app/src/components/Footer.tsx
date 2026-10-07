import { Logo } from './ui'

export default function Footer() {
  return (
    <footer className="relative z-10 mx-auto mt-16 max-w-[1360px] px-6 pb-12">
      <div className="flex flex-col items-center justify-between gap-5 border-t border-line pt-7 sm:flex-row">
        <Logo />
        <div className="flex items-center gap-5">
          <img
            src="/brand/partner-badge.png"
            alt="ClickUp Diamond Partner 2026"
            className="h-12 w-auto"
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">
            © {new Date().getFullYear()} Sharpflow Consulting
          </span>
        </div>
      </div>
    </footer>
  )
}
