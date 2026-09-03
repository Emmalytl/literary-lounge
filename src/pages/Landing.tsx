import { Link } from 'react-router-dom'
import { BookOpen, Calendar, MessageCircle, Users } from 'lucide-react'

const loungeLogo = '/WhatsApp%20Image%202026-09-02%20at%2016.47.35.jpeg'

export default function Landing() {
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
