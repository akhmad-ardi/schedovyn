import { createBrowserRouter } from "react-router"

import { AppShell } from "@/components/layout/app-shell"
import { EditorPage } from "@/pages/editor-page"
import { MasterDataPage } from "@/pages/master-data-page"
import { SettingsPage } from "@/pages/settings-page"

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: <EditorPage />,
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
