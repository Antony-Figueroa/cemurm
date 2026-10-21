// Theme boundary for the imported gerencial template.
//
// The template's header toggle calls useTheme(), which throws outside a
// provider. The member app has no provider because it does not use the
// template's theme vocabulary; mounting this inside the /admin subtree keeps
// the boundary honest: opening an admin route cannot flip the member app's
// html class or its localStorage key.
//
// defaultTheme is dark on purpose: the cem palette is a dark ramp, and
// "system" would render a light shell on a light OS whose cem role colours
// were not designed for that surface.
import { Outlet } from 'react-router-dom'
import { ThemeProvider } from '../../context/shadcntheme/ThemeContext'

export default function AdminThemeBoundary() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Outlet />
    </ThemeProvider>
  )
}
