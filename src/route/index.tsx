import { createBrowserRouter } from "react-router";

import { MainPage } from "@/pages/main-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainPage />,
  },
]);