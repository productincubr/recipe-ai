import { useState } from 'react'
import VideoCard from './VideoCard'
import VideoModal from './VideoModal'
import { channelVideos } from '../../data/culinaryChannel'

/**
 * Responsive video grid (Instagram Explore / YouTube style).
 *
 * Cards wrap onto new rows and the page scrolls normally — there is no nested
 * scroll container. One column on mobile, two on tablet, three from 1280px up.
 * Clicking a card opens its video inline in a <VideoModal /> rather than
 * navigating away.
 */
export default function VideoGrid() {
  const [activeVideo, setActiveVideo] = useState(null)

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
        {channelVideos.map((video) => (
          <VideoCard key={video.id} video={video} onOpen={setActiveVideo} />
        ))}
      </div>

      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </>
  )
}
