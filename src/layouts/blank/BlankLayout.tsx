import { Outlet, useLocation } from "react-router-dom";
import ScrollToTop from "src/components/shared/ScrollToTop";
import DemoNotice from "src/components/shared/DemoNotice";

const BlankLayout = () => {
  const { pathname } = useLocation();
  // The template's auth screens live under /admin/auth/* and are visual demos:
  // they do not call Supabase Auth. The 404 page shares this layout but is a
  // real template page, so it is excluded from the notice.
  const isAuthDemo =
    pathname.startsWith("/admin/auth/") && pathname !== "/admin/auth/404";

  return (
    <ScrollToTop>
      <>
        {isAuthDemo && (
          <div className="bg-cem-hover px-4 py-3">
            <DemoNotice className="mx-auto max-w-3xl">
              Demo auth screen — this form does not sign in. The real CEMURM
              login lives at /auth.
            </DemoNotice>
          </div>
        )}
        <Outlet />
      </>
    </ScrollToTop>
  );
};

export default BlankLayout;
