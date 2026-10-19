import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default function BackButtonHandler() {
  const nav = useNavigate()
  const location = useLocation()
  const backPressedOnce = useRef(false)
  const toastTimeoutRef = useRef(null)
  const toastRef = useRef(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const showToast = (msg) => {
      if (toastRef.current) toastRef.current.remove()
      const el = document.createElement('div')
      el.textContent = msg
      el.style.position = 'fixed'
      el.style.bottom = '80px'
      el.style.left = '50%'
      el.style.transform = 'translateX(-50%)'
      el.style.background = 'rgba(20, 20, 20, 0.95)'
      el.style.color = '#f2f3f5'
      el.style.padding = '12px 20px'
      el.style.borderRadius = '9999px'
      el.style.fontSize = '13px'
      el.style.fontWeight = '500'
      el.style.zIndex = '9999'
      el.style.border = '1px solid #1f1f1f'
      el.style.pointerEvents = 'none'
      el.style.animation = 'fadeIn 200ms ease-out'
      document.body.appendChild(el)
      toastRef.current = el
      setTimeout(() => {
        if (el.parentNode) el.remove()
        toastRef.current = null
      }, 2000)
    }

    const handler = App.addListener('backButton', ({ canGoBack }) => {
      // If on Home, handle exit
      if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register') {
        if (backPressedOnce.current) {
          App.exitApp()
          return
        }
        backPressedOnce.current = true
        showToast('Press back again to exit')

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => {
          backPressedOnce.current = false
        }, 2000)
        return
      }

      // On inner pages: go back if possible, else go home
      if (canGoBack) {
        nav(-1)
      } else {
        nav('/', { replace: true })
      }
    })

    return () => {
      handler.then(h => h.remove())
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      if (toastRef.current) toastRef.current.remove()
    }
  }, [nav, location.pathname])

  return null
}
