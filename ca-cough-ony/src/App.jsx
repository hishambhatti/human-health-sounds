import React from "react"
import Landing from "./Landing"
import { useState } from "react"
import About from "./About"

export default function App() {

  const [pageNum, setPageNum] = useState(3)

  return (
    <>
      {pageNum === 1 && (
        <Landing />
      )}
      {pageNum === 3 && (
        <About />
      )}
    </>
  )
}
