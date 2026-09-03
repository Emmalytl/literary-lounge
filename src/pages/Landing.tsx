import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Calendar, MessageCircle, Users } from 'lucide-react'

const loungeLogo = '/WhatsApp%20Image%202026-09-02%20at%2016.47.35.jpeg'

const communitySlides = [
  {
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85',
    alt: 'Friends gathered together in a warm café setting',
    eyebrow: 'Read together',
    title: 'A table with room for every perspective'
  },
  {
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=85',
    alt: 'A group of friends sharing a relaxed conversation',
    eyebrow: 'Talk it through',
    title: 'The best chapters continue after the page'
  },
  {
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=85',
    alt: 'People collaborating together around a table',
    eyebrow: 'Make connections',
    title: 'A reading club that feels like belonging'
  }
]

export default function Landing() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((slide) => (slide + 1) % communitySlides.length), 6000)
    return () => window.clearInterval(timer)
  }, [])

  function changeSlide(direction: number) {
    setActiveSlide((slide) => (slide + direction + communitySlides.length) % communitySlides.length)
  }

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-12 md:pb-16 text-center">
        <img src={loungeLogo} alt="The Literary Lounge logo" className="lounge-logo mx-auto mb-8" />
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-tight">
          The Literary Lounge
        </h1>
        <p className="mt-3 text-lg md:text-xl text-gold font-medium">Read. Discuss. Connect.</p>
        <p className="mt-6 max-w-prose mx-auto opacity-80">
          A digital clubhouse for people who love books, real conversation, and meeting the
          humans behind the reading lists. Join a community that reads together, talks it
          through on WhatsApp, and eventually meets in person.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/register" className="btn-primary">Join the Lounge</Link>
          <Link to="/library" className="btn-secondary">Explore Library</Link>
          <Link to="/events" className="btn-secondary">Upcoming Events</Link>
        </div>
      </section>

      {/* Community carousel */}
      <section className="border-y border-ink/10 dark:border-ink-dark/10 bg-ink/[0.03] dark:bg-white/[0.03]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="relative overflow-hidden rounded-sm bg-ink text-paper shadow-xl dark:bg-ink-dark dark:text-paper-dark">
            <div className="grid min-h-[26rem] md:grid-cols-[1.25fr_0.75fr]">
              <div className="relative min-h-72 md:min-h-0">
                {communitySlides.map((slide, index) => (
                  <img
                    key={slide.image}
                    src={slide.image}
                    alt={slide.alt}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden={index !== activeSlide}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-ink/10 via-transparent to-ink/30" />
              </div>
              <div className="flex flex-col justify-between p-6 sm:p-8 md:p-10">
                <div>
                  <p className="eyebrow text-gold">{communitySlides[activeSlide].eyebrow}</p>
                  <h2 className="font-display mt-3 text-3xl leading-tight sm:text-4xl">{communitySlides[activeSlide].title}</h2>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70 dark:text-paper-dark/70">Bring your current read, your questions, and your point of view. The Lounge is built for thoughtful company.</p>
                </div>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="flex gap-2" aria-label="Carousel slides">
                    {communitySlides.map((slide, index) => <button key={slide.image} type="button" onClick={() => setActiveSlide(index)} aria-label={`Show slide ${index + 1}`} className={`h-2 rounded-full transition-all ${index === activeSlide ? 'w-8 bg-gold' : 'w-2 bg-paper/40 dark:bg-paper-dark/40'}`} />)}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous community photo" className="rounded-full border border-paper/30 p-2 transition-colors hover:bg-paper/10"><ArrowLeft size={18} /></button>
                    <button type="button" onClick={() => changeSlide(1)} aria-label="Next community photo" className="rounded-full border border-paper/30 p-2 transition-colors hover:bg-paper/10"><ArrowRight size={18} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current book */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 border-t border-ink/10 dark:border-ink-dark/10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="max-w-xs mx-auto md:mx-0 overflow-hidden rounded-sm bg-ink/5 dark:bg-white/5 shadow-xl">
            <img
              src="/white-fang-cover.jpg"
              alt="White Fang book cover"
              className="aspect-[3/4] h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide opacity-60">Currently reading</p>
            <h2 className="font-display text-3xl mt-1">White Fang</h2>
            <p className="opacity-70">Jack London</p>
            <p className="mt-4 opacity-80 max-w-prose">
              A wild wolf-dog's journey from the wilderness of the Yukon to domestication —
              the Lounge's first read, and the book our founding members are discussing right now.
            </p>
            <Link to="/library" className="btn-primary mt-6 inline-flex">Start reading</Link>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 border-t border-ink/10 dark:border-ink-dark/10">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: BookOpen, title: 'Read', desc: 'Work through a shared book at your own pace, with progress and notes saved.' },
            { icon: MessageCircle, title: 'Discuss', desc: 'Join scheduled WhatsApp conversations with fellow readers.' },
            { icon: Users, title: 'Connect', desc: 'Meet the people behind the messages at Lounge events and meetups.' }
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card">
              <Icon className="text-gold mb-3" size={26} />
              <h3 className="font-display text-xl mb-1">{title}</h3>
              <p className="opacity-70 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming event teaser */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 border-t border-ink/10 dark:border-ink-dark/10">
        <div className="card flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <Calendar className="text-gold mt-1" size={22} />
            <div>
              <p className="text-sm uppercase tracking-wide opacity-60">Next event</p>
              <h3 className="font-display text-xl">White Fang — Opening Chapters Discussion</h3>
              <p className="opacity-70 text-sm">A live WhatsApp discussion for anyone reading along.</p>
            </div>
          </div>
          <Link to="/events" className="btn-secondary shrink-0">See all events</Link>
        </div>
      </section>
    </div>
  )
}
