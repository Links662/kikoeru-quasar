import MainLayout from 'layouts/MainLayout'
import DashboardLayout from 'layouts/DashboardLayout'

import Works from 'pages/Works'
import List from 'pages/List'
import Login from 'pages/Login'
import Favourites from 'pages/Favourites'

import Folders from 'pages/Dashboard/Folders'
import Advanced from 'pages/Dashboard/Advanced'
import UserManage from 'pages/Dashboard/UserManage'
import CollectionLayout from 'pages/Dashboard/CollectionLayout'
import CollectionTaskRun from 'pages/Dashboard/TaskRun'
import CollectionAutomations from 'pages/Dashboard/Automations'
import CollectionSettings from 'pages/Dashboard/CollectionSettings'

const routes = [
  {
    path: '/admin',
    component: DashboardLayout,
    children: [
      {
        path: '',
        redirect: '/admin/collection/run'
      },
      {
        path: 'folders',
        component: Folders
      },
      {
        path: 'collection',
        component: CollectionLayout,
        children: [
          {
            path: '',
            redirect: '/admin/collection/run'
          },
          {
            path: 'run',
            component: CollectionTaskRun
          },
          {
            path: 'automations',
            component: CollectionAutomations
          },
          {
            path: 'settings',
            component: CollectionSettings
          }
        ]
      },
      {
        path: 'scanner',
        redirect: '/admin/collection/run'
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
        redirect: '/works'
      },
      {
        path: 'works',
        name: 'works',
        component: Works
      },
      {
        path: 'circles',
        props: { conditionType: 'circle' },
        component: List
      },
      {
        path: 'tags',
        props: { conditionType: 'tag' },
        component: List
      },
      {
        path: 'vas',
        props: { conditionType: 'va' },
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
if (process.env.MODE !== 'ssr') {
  routes.push({
    // Vue Router 4 removed star/catch-all routes; use a param with a custom
    // regexp instead. https://router.vuejs.org/guide/migration/#removed-star-or-catch-all-routes
    path: '/:pathMatch(.*)*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
