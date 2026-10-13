// Synthetic HTML fixtures that mirror the live Webflow markup (class names
// and nesting copied from the live pages). Content is invented: the child
// fixture in particular must never contain a real child's data.
const CDN = 'https://cdn.prod.website-files.com/site'

const chrome = (body) => `<!doctype html><html><head>
<title>Fixture | Victoria Venezuela Foundation</title>
<meta name="description" content="Fixture description">
<meta property="og:image" content="${CDN}/og.png">
</head><body>
<div class="navbar w-nav"><a class="brand w-nav-brand" href="/"><img class="navbar_logo" src="${CDN}/logo.svg" alt="VVF"></a></div>
${body}
<div class="footer_component"><a class="footer_link" href="/contact">Contact</a></div>
</body></html>`

export const teamMemberHtml = chrome(`
<section class="bio_hero"><div class="bio_hero-inner">
  <div class="bio_intro"><p class="bio_eyebrow">Our Team</p><h1 class="bio_name">Ana Example</h1><p class="bio_role">Director</p></div>
  <div class="bio_card">
    <img class="bio_photo" src="${CDN}/ana.webp" alt="Ana Example">
    <div class="bio_card-content">
      <p class="bio_quote">Ana believes in service.</p>
      <div class="bio_fact-row">
        <div class="bio_fact"><p class="bio_fact-label">Since</p><p class="bio_fact-value">2023</p></div>
        <div class="bio_fact"><p class="bio_fact-label">From</p><p class="bio_fact-value">Maracay, VE</p></div>
        <div class="bio_linkedin"><a class="bio_linkedin-icon w-inline-block" href="https://www.linkedin.com/in/ana"></a></div>
      </div>
    </div>
  </div>
</div></section>
<section class="bio_body-section">
  <div class="bio_text"><p class="bio_lead">Ana leads programs.</p>
    <div class="bio_body w-richtext"><p id="">First paragraph.</p><p>Second paragraph.</p></div></div>
  <div class="bio_sidebar"><div class="bio_background-box"><p class="bio_box-label">Background</p>
    <div class="bio_items"><div class="bio_item"><p class="bio_item-label">MBA</p><p class="bio_item-detail">Finance</p></div></div>
  </div></div>
</section>`)

export const teamIndexHtml = chrome(`
<section class="section-2 is-grey"><div class="member-grid_inner">
  <div class="section-title_component"><div class="section-title_tagline"><p class="title_tagline">BOARD</p></div>
    <div class="section-title_content"><h2 class="section-title_heading">Board of Directors</h2><p class="section-title_text">Sets direction.</p></div></div>
  <div class="team-grid_list is-board w-dyn-items">
    <div class="team-grid_item w-dyn-item"><a class="team-card_link w-inline-block" href="/team-members/ana-example"></a>
      <div class="team-card_component"><img class="team-member-img" src="${CDN}/ana.webp" alt="Ana Example">
        <h3 class="team-card_name">Ana Example</h3><div class="team-card_title">Chair</div></div></div>
    <div class="team-grid_item w-dyn-item"><div class="team-card_component"><img class="team-member-img" src="${CDN}/placeholder.png" alt="Join our board">
      <h3 class="team-card_name">Join our board</h3><div class="team-card_title">Seat open</div>
      <a class="team-card_open-seat w-inline-block" href="/contact"><div class="team-card_open-tile">
        <div class="team-card_open-kicker">Board seat open</div><div class="team-card_open-heading">Help guide</div><div class="team-card_open-button">Get in touch</div></div></a></div></div>
  </div>
</div></section>
<section class="section-2"><div class="member-grid_inner">
  <div class="section-title_component"><div class="section-title_tagline"><p class="title_tagline">STAFF</p></div>
    <div class="section-title_content"><h2 class="section-title_heading">Our Team</h2></div></div>
  <div class="team-grid_list w-dyn-items">
    <div class="team-grid_item w-dyn-item"><a class="team-card_link w-inline-block" href="/team-members/ana-example"></a>
      <div class="team-card_component"><h3 class="team-card_name">Ana Example</h3><div class="team-card_title">Executive Director</div></div></div>
  </div>
</div></section>`)

export const childHtml = chrome(`
<section class="section_child-detail"><div class="padding-global is-child-detail">
  <div class="div-block-113"><h1 class="heading-25">Test C.</h1></div>
  <div class="div-block-123"><img class="image-23" src="${CDN}/child.jpeg" alt="Photo of a child"></div>
  <div class="div-block-115"><img class="image-24" src="${CDN}/icon.svg" alt="">
    <div class="w-container"><h2 class="heading-26">Age:</h2><div class="code-embed-2 w-embed">9 years old</div></div></div>
  <div class="div-block-118"><div class="w-container"><h2 class="heading-26">Birthday:</h2><h3 class="heading-26">January 2, 2017</h3></div></div>
  <div class="div-block-119"><div class="w-container"><h2 class="heading-26">Gender:</h2><h3 class="heading-26">Female</h3></div></div>
  <div class="div-block-120"><div class="w-container"><h2 class="heading-26">Dream:</h2><h3 class="heading-26">She wants to be a teacher.</h3></div></div>
  <div class="code-embed-3 w-embed">About Test C.</div>
  <div class="w-richtext"><p>Test lives with her family.</p></div>
</div></section>`)

export const childListHtml = chrome(`
<section class="children-list_section"><div class="w-dyn-items">
  <div class="children-list_item w-dyn-item"><img class="image-22" src="${CDN}/a.jpeg" alt="Test A."><p class="paragraph-20">7</p><h2>Test A.</h2></div>
  <div class="children-list_item w-dyn-item"><img class="image-22" src="${CDN}/b.jpeg" alt="Test B."><p class="paragraph-20">8</p><h2>Test B.</h2></div>
</div><a class="w-pagination-next" href="?abc_page=2">Next</a></section>`)

export const resourceHtml = chrome(`
<section class="section_resources"><div class="padding-global is-article-page">
  <div class="article_header">
    <div class="article_seo-warning"><strong class="article_seo-warning-intro">Missing SEO fields (this bar shows on staging only):</strong></div>
    <div class="article_title-group">
      <div class="article_date"><div>Last updated</div><div>March 1, 2026</div></div>
      <h1 class="resources_page-title is-article-title">Example Report</h1>
      <div class="article_byline"><div class="article_byline-text">
        <div class="article_inline">By</div><div class="article_inline">Ana Example</div><div class="article_inline">,</div><div class="article_inline">Director, VVF</div>
      </div></div>
    </div>
  </div>
  <div class="resources_columns is-article"><div class="article_main">
    <img class="article_featured-image" src="${CDN}/cover.png" alt="Report cover">
    <div class="article_body w-richtext"><p>Intro.</p><h2>Section</h2><ul><li>Point</li></ul></div>
    <a class="button is-primary" href="${CDN}/report.pdf">Download</a>
  </div></div>
</div></section>`)

export const resourceListHtml = chrome(`
<section class="section_resources"><div class="w-dyn-items"><div class="w-dyn-item">
  <a class="resources_card-link w-inline-block" href="/resources/example-report"><div class="article-card_component">
    <div class="article-card_image-wrapper"><img class="article-card_image" src="${CDN}/card.jpeg" alt="Card"></div>
    <div class="article-card_content"><div class="article-card_date">February 3, 2026</div>
      <div class="article-card_text"><h3 class="article-card_heading">Example Report</h3><p class="article-card_excerpt">Short excerpt.</p></div></div>
  </div></a>
</div></div></section>`)

export const eventHtml = chrome(`
<section class="section_hero"><img class="hero-background-img" src="${CDN}/hero.png" alt="Golfers">
  <div class="hero_card"><h1 class="hero_heading">Play for a Purpose</h1><p class="hero_body">Every swing counts.</p>
  <a class="button is-primary" href="https://donorbox.org/events/123456/steps/choose_tickets">Buy Tickets</a></div></section>
<section class="www_section"><div class="www_card"><p class="www_title">2030 Golf Tournament</p><p class="www_text">Monday, November 4, 2030</p>
  <a class="www_map-link w-inline-block" href="https://maps.example/x"><p class="www_text">The Club</p><p class="www_text">1 Course Rd, Weston, FL</p></a></div></section>
<section class="section_partners"><div class="logos_component"><div class="w-dyn-items">
  <div class="w-dyn-item"><a class="link-block-1" href="https://sponsor.example"><img class="image-4" src="${CDN}/sponsor.png" alt="Sponsor Co"></a></div>
  <div class="w-dyn-item"><a class="link-block-1" href="https://sponsor.example"><img class="image-4" src="${CDN}/sponsor.png" alt="Sponsor Co"></a></div>
</div></div></section>
<section class="section-11"><div class="event-program_list w-richtext"><ul><li><strong>8:00 AM</strong> Breakfast</li></ul></div>
  <div class="event-includes_list w-richtext"><ul><li>Lunch</li></ul></div>
  <div class="offer-data w-dyn-list"><div class="w-dyn-items">
    <div data-id="golf-foursome" data-kind="Ticket" class="w-dyn-item"><div class="od-name">Foursome</div><div class="od-short w-dyn-bind-empty"></div>
      <div class="od-price">$1,000</div><div class="od-includes w-richtext"><ul><li>Entry for 4</li></ul></div><div class="od-label">Buy Tickets</div>
      <a href="https://donorbox.org/events/123456/steps/choose_tickets" class="od-link">link</a></div>
    <div data-id="golf-gold" data-kind="Package" class="w-dyn-item"><div class="od-name">Gold Sponsor</div><div class="od-short w-dyn-bind-empty"></div>
      <div class="od-price">$2,500</div><div class="od-includes w-dyn-bind-empty w-richtext"></div><div class="od-label">Become a Sponsor</div></div>
    <div data-id="golf-lounge" data-kind="Special opportunity" class="w-dyn-item"><div class="od-name">Physical Therapy Lounge</div><div class="od-short">PT Lounge</div>
      <div class="od-price">$1,000</div><div class="od-sold">Sold</div></div>
  </div></div>
  <div class="benefit-data w-dyn-list"><div class="w-dyn-items">
    <div data-section="Players" class="w-dyn-item"><div class="br-name">Foursomes</div><div class="br-col">3</div><div class="br-col w-dyn-bind-empty"></div></div>
  </div></div></section>
<section class="faq_section"><div class="faq-row_component"><div class="faq-row_question"><h3>When is it?</h3></div>
  <div class="faq-row_answer"><p class="faq-row_answer-text">In November.</p></div></div></section>`)
