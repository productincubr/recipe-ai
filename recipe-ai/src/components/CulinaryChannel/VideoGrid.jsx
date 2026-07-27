import VideoCard from './VideoCard'
import { channelVideos } from '../../data/culinaryChannel'

/**
 * Responsive video grid (Instagram Explore / YouTube style).
 *
 * Cards wrap onto new rows and the page scrolls normally — there is no nested
 * scroll container. One column on mobile, two on tablet, three from 1280px up.
 */
export default function VideoGrid() {
  const openVideo = (video) => {
    console.log('Play video:', video.title)
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
      {channelVideos.map((video) => (
        <VideoCard key={video.id} video={video} onOpen={openVideo} />
      ))}
    </div>
  )
}
