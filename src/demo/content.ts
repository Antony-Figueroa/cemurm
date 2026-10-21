// Static content for the template demo screens.
//
// blog, notes and tickets have no CEMURM domain yet, so they stay as visual
// demos. The template's original mock modules generated their rows with
// `chance` and served them through MSW handlers that are never started, which
// left every demo page empty. This module replaces that dead path with fixed
// in-memory content: no network, no Supabase, no dev-only dependency at
// runtime. Changes made on those screens live in React state only.
import blogImg1 from '@/assets/images/blog/blog-img1.png'
import blogImg2 from '@/assets/images/blog/blog-img2.png'
import blogImg3 from '@/assets/images/blog/blog-img3.png'
import blogImg4 from '@/assets/images/blog/blog-img4.png'
import blogImg5 from '@/assets/images/blog/blog-img5.png'
import blogImg6 from '@/assets/images/blog/blog-img6.png'
import userImg1 from '@/assets/images/profile/user-1.png'
import userImg2 from '@/assets/images/profile/user-2.png'
import userImg3 from '@/assets/images/profile/user-3.png'
import userImg4 from '@/assets/images/profile/user-4.png'
import userImg5 from '@/assets/images/profile/user-5.png'
import userImg6 from '@/assets/images/profile/user-6.png'
import type { BlogPostType } from '@/types/apps/blog'
import type { notesType } from '@/types/apps/notes'
import type { TicketType } from '@/types/apps/ticket'

const ana = { id: 'author-ana', avatar: userImg1, name: 'Ana Torres' }
const diego = { id: 'author-diego', avatar: userImg2, name: 'Diego Ruiz' }

export const demoBlogPosts: BlogPostType[] = [
  {
    id: 1,
    title: 'The quiet craft of a setlist',
    content:
      'A setlist is not a playlist. It decides when the room breathes, when it sings and when it rests. These are the small rules we use before every show.',
    coverImg: blogImg1,
    createdAt: new Date('2026-10-12T09:00:00Z'),
    view: 1240,
    share: 86,
    category: 'Music',
    featured: true,
    author: ana,
    published: true,
    comments: [
      {
        id: 'comment-1',
        profile: { id: 'reader-1', avatar: userImg3, name: 'Marta Gil' },
        time: new Date('2026-10-12T14:20:00Z'),
        comment:
          'The point about leaving space between two loud songs is the one I always forget.',
        replies: [
          {
            id: 'reply-1',
            profile: { id: 'author-ana-reply', avatar: userImg1, name: 'Ana Torres' },
            time: new Date('2026-10-12T15:02:00Z'),
            comment: 'That gap is where the audience actually hears the last chorus.',
            replies: [],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Rehearsal notes that actually help',
    content:
      'A page of observations is worth more than a recording nobody opens. Write down the two bars that fell apart, not the whole song.',
    coverImg: blogImg2,
    createdAt: new Date('2026-10-08T18:30:00Z'),
    view: 860,
    share: 41,
    category: 'Practice',
    featured: false,
    author: diego,
    published: true,
    comments: [],
  },
  {
    id: 3,
    title: 'Why your band needs a soundcheck checklist',
    content:
      'Every room is different and every cable is the same color. A five-line checklist saves the fifteen minutes you would spend guessing.',
    coverImg: blogImg3,
    createdAt: new Date('2026-10-03T11:15:00Z'),
    view: 1530,
    share: 120,
    category: 'Live',
    featured: false,
    author: ana,
    published: true,
    comments: [],
  },
  {
    id: 4,
    title: 'Transposing on the fly without panic',
    content:
      'If the singer changes the key at the last second, you need a shape, not a chart. Practice the interval, then trust your ear.',
    coverImg: blogImg4,
    createdAt: new Date('2026-09-28T08:45:00Z'),
    view: 980,
    share: 55,
    category: 'Theory',
    featured: false,
    author: diego,
    published: true,
    comments: [],
  },
  {
    id: 5,
    title: 'A small rig for small stages',
    content:
      'Two pedals, one amp and a tuner can carry a whole night. The best rig is the one you can set up in the dark.',
    coverImg: blogImg5,
    createdAt: new Date('2026-09-21T16:00:00Z'),
    view: 720,
    share: 33,
    category: 'Gear',
    featured: false,
    author: ana,
    published: true,
    comments: [],
  },
  {
    id: 6,
    title: 'What we learned from thirty shows',
    content:
      'The songs that worked were not always the ones we liked most. The audience told us which ones to keep, one room at a time.',
    coverImg: blogImg6,
    createdAt: new Date('2026-09-15T10:10:00Z'),
    view: 1810,
    share: 142,
    category: 'Live',
    featured: false,
    author: diego,
    published: true,
    comments: [],
  },
]

export const demoNotes: notesType[] = [
  {
    id: 1,
    color: 'chart-1',
    title: 'Call the venue about the load-in time. They said 4 pm, but the doors open at 6.',
    datef: '2026-10-19T10:30:00Z',
    deleted: false,
  },
  {
    id: 2,
    color: 'chart-2',
    title: 'Setlist idea: open with the slow one, then go straight into the new song.',
    datef: '2026-10-18T21:05:00Z',
    deleted: false,
  },
  {
    id: 3,
    color: 'chart-3',
    title: 'Ask Marta if she can cover the second guitar on the 24th.',
    datef: '2026-10-17T12:40:00Z',
    deleted: false,
  },
  {
    id: 4,
    color: 'chart-4',
    title: 'The monitor mix needs more voice and less kick on the small stage.',
    datef: '2026-10-15T19:15:00Z',
    deleted: false,
  },
]

export const demoTickets: TicketType[] = [
  {
    Id: 1,
    ticketTitle: 'Change the rehearsal room for next week',
    ticketDescription:
      'The usual room is booked. Confirm the alternate room and tell the band before Friday.',
    Status: 'Open',
    Label: 'warning',
    thumb: userImg2,
    AgentName: 'Ana',
    Date: new Date('2026-10-19T09:20:00Z'),
    deleted: false,
  },
  {
    Id: 2,
    ticketTitle: 'Missing XLR cable after the last show',
    ticketDescription:
      'One long XLR did not come back in the case. Check the venue lost and found.',
    Status: 'Pending',
    Label: 'error',
    thumb: userImg3,
    AgentName: 'Diego',
    Date: new Date('2026-10-18T17:45:00Z'),
    deleted: false,
  },
  {
    Id: 3,
    ticketTitle: 'Publish the October setlist',
    ticketDescription:
      'The band approved the order. Share it with the collaborators and print two copies.',
    Status: 'Open',
    Label: 'success',
    thumb: userImg4,
    AgentName: 'Marta',
    Date: new Date('2026-10-17T11:10:00Z'),
    deleted: false,
  },
  {
    Id: 4,
    ticketTitle: 'Update the stage plot',
    ticketDescription:
      'The new keyboard position changes the monitor sends. Update the plot before the next gig.',
    Status: 'Closed',
    Label: 'success',
    thumb: userImg5,
    AgentName: 'Ana',
    Date: new Date('2026-10-14T08:30:00Z'),
    deleted: false,
  },
  {
    Id: 5,
    ticketTitle: 'Confirm the guest list with the venue',
    ticketDescription:
      'Six names were sent. Ask for confirmation and keep the list in the gig notes.',
    Status: 'Closed',
    Label: 'error',
    thumb: userImg6,
    AgentName: 'Diego',
    Date: new Date('2026-10-11T15:05:00Z'),
    deleted: false,
  },
  {
    Id: 6,
    ticketTitle: 'Replace the broken strap',
    ticketDescription:
      'The backup strap is not safe. Order a replacement before the weekend.',
    Status: 'Pending',
    Label: 'warning',
    thumb: userImg1,
    AgentName: 'Marta',
    Date: new Date('2026-10-09T13:25:00Z'),
    deleted: false,
  },
]
