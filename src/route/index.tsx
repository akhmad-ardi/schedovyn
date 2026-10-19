import { createBrowserRouter } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import { MainPage } from "@/pages/main-page"
import { MasterDataPage } from "@/pages/master-data-page"
import { SettingsPage } from "@/pages/settings-page"

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: <MainPage />,
      },
      {
        path: "/master-data",
        element: <MasterDataPage />,
      },
      {
        path: "/settings",
        element: <SettingsPage />,
      },
    ],
  },
])
