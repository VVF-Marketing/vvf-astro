import ArticleCard from './ArticleCard.astro'

export default {
  title: 'Molecules/ArticleCard',
  component: ArticleCard,
}

// Live resources (harvested media).
const sponsorArticle = {
  href: '/resources/how-to-sponsor-a-child-directly',
  title: 'How to sponsor a child directly, without going through a large charity',
  date: '2026-09-16T00:00:00.000Z',
  excerpt: 'Direct child sponsorship means your monthly gift supports an identified child through a specific organization, and you can see where the money goes.',
  category: 'Stories',
  imageUrl: '/seed-media/resources/6179ff54-vvf-sponsorarticle-featured-v2.jpeg',
}

export const Featured = {
  args: { ...sponsorArticle, variant: 'featured' },
}

export const Grid = {
  args: {
    href: '/resources/impact-report-2025',
    title: 'Impact Report 2025',
    date: '2026-02-03T00:00:00.000Z',
    excerpt: 'Since 2022 we have served 77,300 meals and given 1,012 medical visits to children. Read our full 2025 Impact Report, including financials and team.',
    imageUrl: '/seed-media/resources/2d41d8bc-vvf-financialscover-annual-featured-v1.png',
  },
}

export const Related = {
  args: {
    href: '/resources/impact-report-2025',
    title: 'Impact Report 2025',
    category: 'Financials',
    imageUrl: '/seed-media/resources/2d41d8bc-vvf-financialscover-annual-featured-v1.png',
    variant: 'related',
  },
}
