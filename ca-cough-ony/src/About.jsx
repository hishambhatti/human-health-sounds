import React from 'react'
import Button from './components/Button'

export default function About({ handleClickExplore }) {
  return (
    <div className='min-h-screen bg-[#f4f3ef] flex flex-col items-center py-10 px-6 font-[Poppins,sans-serif]'>
      {/* Title */}
      <h1 className='text-3xl font-light tracking-wide mb-8 text-gray-800'>
        CaCOUGHony
      </h1>

      {/* Image (placeholder for video) */}
      <div className='w-full max-w-3xl border border-gray-300 shadow-sm'>
        <img
          src='/about_temp.png'
          alt='Spectrogram display'
          className='w-full h-auto object-cover'
        />
      </div>

      {/* Text Section */}
      <div className='max-w-3xl text-gray-700 mt-8 leading-relaxed text-[1.05rem]'>
        <p className='mb-4'>
          Built by Hisham Bhatti at the Ubicomp Lab at the University of Washington. Based on{" "}
            <a
              href="https://experiments.withgoogle.com/ai/bird-sounds/view"
              className="text-sky-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bird Sounds
            </a>{" "}
          from Google Creative Lab. Thanks to{" "}
            <a
              href="https://homes.cs.washington.edu/~zzhihan"
              className="text-sky-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Zhihan Zhang
            </a>{" "}
          for his support. Audio clips are provided by{" "}
            <a
              href="https://github.com/YuanGongND/vocalsound"
              className="text-sky-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              VocalSound
            </a>, and the open-source code is available{" "}
            <a
              href="https://github.com/hishambhatti/human-health-sounds"
              className="text-sky-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>{"."}
        </p>
      </div>

      {/* Explore Button */}
        <div className='mt-2'>
          <Button variant='filled' handleClick={handleClickExplore}>
            EXPLORE
          </Button>
      </div>
    </div>
  )
}
