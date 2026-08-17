import type { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'

import { ensureLogin } from './services/api'
import './app.css'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    void ensureLogin()
  })

  return children
}

export default App
