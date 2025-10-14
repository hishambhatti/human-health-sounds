import React from "react"
import Landing from "./Landing"
import { useState } from "react"

export default function App() {

  const [pageNum, setPageNum] = useState(1)

  return (
    <>
      {pageNum === 1 && (
        <Landing />
      )}
    </>
  )
}
