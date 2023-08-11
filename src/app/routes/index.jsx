import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { default as routes } from './routes'

export default function AppRoutes () {
  return (
    <Router>
      <Switch>
        <Route path={routes.home}>
          <div>hello</div>
        </Route>
      </Switch>
    </Router>
  )
}
