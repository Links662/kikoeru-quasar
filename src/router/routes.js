import MainLayout from 'layouts/MainLayout'
import DashboardLayout from 'layouts/DashboardLayout'

import Works from 'pages/Works'
import Work from 'pages/Work'
import List from 'pages/List'
import Login from 'pages/Login'
import Favourites from 'pages/Favourites'

import Folders from 'pages/Dashboard/Folders'
import Scanner from 'pages/Dashboard/Scanner'
import Advanced from 'pages/Dashboard/Advanced'
import UserManage from 'pages/Dashboard/UserManage'

const routes = [
  {
    path: '/admin',
    component: DashboardLayout,
    children: [
      {
        path: '',
        component: Folders
      },
      {
        path: 'scanner',
        component: Scanner
      },
      {
        path: 'advanced',
        component: Advanced
      },
      {
        path: 'usermanage',
        component: UserManage
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: {
          name: 'works'
        }
      },
      {
        path: 'works',
        name: 'works',
        component: Works
      },
      {
        path: 'work/:id',
        component: Work
      },
      {
        path: 'circles',
        props: { restrict: "circles" },
        component: List
      },
      {
        path: 'tags',
        props: { restrict: "tags" },
        component: List
      },
      {
        path: 'vas',
        props: { restrict: "vas" },
        component: List
      },
      {
        path: 'progress',
        component: Favourites
      },
    ],
    meta: {
      auth: true
    }
  },
  {
    path: '/login',
    component: Login
  }
]

// Always leave this as last one
// eslint-disable-next-line
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
