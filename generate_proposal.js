const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Addis Maed / CommunityHub Team';
pptx.company = 'Addis Maed Community Platform';
pptx.title = 'Addis Maed (CommunityHub) - Service Proposal';
pptx.subject = 'Ethiopian Hyperlocal Community & Social Discovery Platform';

// Color Palette
const COLORS = {
  navyDark: '0F172A',
  navyPrimary: '1E293B',
  emerald: '059669',
  emeraldLight: 'ECFDF5',
  amber: 'D97706',
  amberLight: 'FFFBEB',
  blue: '2563EB',
  blueLight: 'EFF6FF',
  purple: '7C3AED',
  purpleLight: 'F5F3FF',
  bgLight: 'F8FAFC',
  cardBg: 'FFFFFF',
  cardBorder: 'E2E8F0',
  textDark: '0F172A',
  textMuted: '64748B',
  white: 'FFFFFF'
};

// Helper to add header to standard content slides
function addSlideHeader(slide, title, category, subtitle) {
  // Top category badge
  slide.addShape('roundRect', {
    x: 0.8,
    y: 0.5,
    w: 2.3,
    h: 0.32,
    rectRadius: 0.05,
    fill: { color: COLORS.emeraldLight },
    line: { color: COLORS.emerald, width: 1 }
  });
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.5,
    w: 2.3,
    h: 0.32,
    fontSize: 9,
    bold: true,
    color: COLORS.emerald,
    align: 'center',
    valign: 'middle'
  });

  // Slide Title
  slide.addText(title, {
    x: 0.8,
    y: 0.9,
    w: 11.5,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COLORS.navyDark,
    valign: 'middle'
  });

  // Subtitle / Description
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8,
      y: 1.45,
      w: 11.5,
      h: 0.35,
      fontSize: 12,
      color: COLORS.textMuted,
      valign: 'top'
    });
  }

  // Footer bar
  slide.addShape('line', {
    x: 0.8,
    y: 7.0,
    w: 11.7,
    h: 0,
    line: { color: COLORS.cardBorder, width: 1 }
  });
  slide.addText('Addis Maed (CommunityHub) — Service Proposal & Strategy Presentation', {
    x: 0.8,
    y: 7.05,
    w: 8.0,
    h: 0.3,
    fontSize: 9,
    color: COLORS.textMuted
  });
  slide.addText('CONFIDENTIAL', {
    x: 10.5,
    y: 7.05,
    w: 2.0,
    h: 0.3,
    fontSize: 9,
    bold: true,
    color: COLORS.textMuted,
    align: 'right'
  });
}

// ==========================================
// SLIDE 1: TITLE SLIDE (Cover)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navyDark };

  // Decorative accent line
  slide.addShape('rect', {
    x: 1.0,
    y: 1.8,
    w: 1.2,
    h: 0.08,
    fill: { color: COLORS.emerald }
  });

  slide.addText('SERVICE & PRODUCT PROPOSAL', {
    x: 1.0,
    y: 2.1,
    w: 9.0,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: COLORS.emerald,
    charSpacing: 2
  });

  slide.addText('Addis Maed (አዲስ ማዕድ)\nCommunityHub Platform', {
    x: 1.0,
    y: 2.5,
    w: 11.0,
    h: 1.8,
    fontSize: 38,
    bold: true,
    color: COLORS.white,
    lineSpacing: 46
  });

  slide.addText('Hyperlocal Community Discovery, Events, Interactive Entertainment & Social Networking for Ethiopia', {
    x: 1.0,
    y: 4.4,
    w: 10.5,
    h: 0.8,
    fontSize: 16,
    color: '94A3B8'
  });

  // Metadata Card
  slide.addShape('roundRect', {
    x: 1.0,
    y: 5.5,
    w: 11.33,
    h: 1.2,
    rectRadius: 0.1,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 }
  });

  const metaItems = [
    { label: 'Target Market', val: 'Ethiopia & Diaspora' },
    { label: 'Core Focus', val: 'Places, Events, Culture, Social' },
    { label: 'Technology', val: 'React, Node.js, PostgreSQL' },
    { label: 'Document Version', val: 'v1.2 Comprehensive Proposal' }
  ];

  metaItems.forEach((item, idx) => {
    const colX = 1.3 + idx * 2.8;
    slide.addText(item.label.toUpperCase(), {
      x: colX,
      y: 5.65,
      w: 2.6,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: '64748B'
    });
    slide.addText(item.val, {
      x: colX,
      y: 5.95,
      w: 2.6,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: COLORS.white
    });
  });
}

// ==========================================
// SLIDE 2: EXECUTIVE SUMMARY
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Executive Summary: The Addis Maed Vision', 'Market Opportunity', 'Bridging the physical and digital pulse of Ethiopian urban communities.');

  // Top Vision Box
  slide.addShape('roundRect', {
    x: 0.8,
    y: 1.9,
    w: 11.7,
    h: 1.3,
    rectRadius: 0.1,
    fill: { color: COLORS.white },
    line: { color: COLORS.emerald, width: 2 }
  });
  slide.addText('Core Mission', {
    x: 1.1,
    y: 2.05,
    w: 2.0,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLORS.emerald
  });
  slide.addText('To create Ethiopia’s most vibrant, reliable, and culturally authentic digital hub—uniting local discovery, live urban events, interactive community entertainment, and social engagement into a single unified mobile-first ecosystem.', {
    x: 1.1,
    y: 2.35,
    w: 11.0,
    h: 0.7,
    fontSize: 13.5,
    color: COLORS.textDark,
    lineSpacing: 18
  });

  // 3 Pillar Highlights
  const pillars = [
    {
      title: 'Hyperlocal Discovery',
      accent: COLORS.blue,
      bg: COLORS.blueLight,
      desc: 'Accurate mapping of Addis Ababa cafes, restaurants, coworking spaces, cultural spots, and services via OpenStreetMap geospatial data.'
    },
    {
      title: 'Events & Engagement',
      accent: COLORS.emerald,
      bg: COLORS.emeraldLight,
      desc: 'Centralized event calendar with AI extraction, ticket booking, and real-time community RSVP to never miss city happenings.'
    },
    {
      title: 'Cultural Touchpoints',
      accent: COLORS.amber,
      bg: COLORS.amberLight,
      desc: 'Distinctive Ethiopian entertainment including scheduled "Joke Time" (ቀልድና ጨዋታ), trivia quizzes, and localized social interaction.'
    }
  ];

  pillars.forEach((p, idx) => {
    const cardX = 0.8 + idx * 4.0;
    slide.addShape('roundRect', {
      x: cardX,
      y: 3.4,
      w: 3.7,
      h: 3.3,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 }
    });

    // Top color strip
    slide.addShape('rect', {
      x: cardX,
      y: 3.4,
      w: 3.7,
      h: 0.1,
      fill: { color: p.accent }
    });

    slide.addText(p.title, {
      x: cardX + 0.3,
      y: 3.7,
      w: 3.1,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: COLORS.navyDark
    });

    slide.addText(p.desc, {
      x: cardX + 0.3,
      y: 4.2,
      w: 3.1,
      h: 1.5,
      fontSize: 12,
      color: COLORS.textMuted,
      lineSpacing: 17
    });

    // Sub-bullet pill
    slide.addShape('roundRect', {
      x: cardX + 0.3,
      y: 5.9,
      w: 3.1,
      h: 0.5,
      rectRadius: 0.08,
      fill: { color: p.bg },
      line: { color: p.accent, width: 1 }
    });
    slide.addText('Key Driver: High Engagement', {
      x: cardX + 0.3,
      y: 5.9,
      w: 3.1,
      h: 0.5,
      fontSize: 10,
      bold: true,
      color: p.accent,
      align: 'center',
      valign: 'middle'
    });
  });
}

// ==========================================
// SLIDE 3: STATEMENT OF THE PROBLEM
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Statement of the Problem', 'Current Challenges', 'Critical friction points preventing effective local discovery and community cohesion.');

  const problems = [
    {
      num: '01',
      title: 'Scattered & Noisy Information Channels',
      desc: 'Users rely heavily on cluttered Telegram channels and Facebook groups where events and announcements get buried within minutes, resulting in missed opportunities and poor discoverability.',
      impact: '70%+ of local events struggle with attendance due to fragmented promo.'
    },
    {
      num: '02',
      title: 'Inaccurate & Outdated Local Place Data',
      desc: 'Global map providers have incomplete metadata, opening hours, or contact info for Ethiopian businesses, creating frustration for both locals and visiting diaspora.',
      impact: 'High drop-off rate when trying to find reliable spots, menus, and contacts.'
    },
    {
      num: '03',
      title: 'Lack of Culturally Localized Entertainment',
      desc: 'Existing social networks are generic, algorithms favor global content, and there are virtually no digital platforms celebrating Ethiopian humor, trivia, and community traditions.',
      impact: 'Audience feels alienated; high demand for tailored local digital culture.'
    },
    {
      num: '04',
      title: 'Weak SME Promotion & Direct Engagement',
      desc: 'Small businesses and venue owners have no dedicated, cost-effective digital channel to showcase verified menus, photos, announcements, and respond to neighborhood feedback.',
      impact: 'Expensive social media ads yield low local foot-traffic conversions.'
    }
  ];

  problems.forEach((prob, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const posX = 0.8 + col * 6.0;
    const posY = 1.9 + row * 2.45;

    slide.addShape('roundRect', {
      x: posX,
      y: posY,
      w: 5.7,
      h: 2.25,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: 'FCA5A5', width: 1 }
    });

    // Red alert stripe
    slide.addShape('rect', {
      x: posX,
      y: posY,
      w: 0.12,
      h: 2.25,
      fill: { color: 'EF4444' }
    });

    slide.addText(prob.num, {
      x: posX + 0.3,
      y: posY + 0.18,
      w: 0.6,
      h: 0.3,
      fontSize: 16,
      bold: true,
      color: 'EF4444'
    });

    slide.addText(prob.title, {
      x: posX + 0.9,
      y: posY + 0.15,
      w: 4.5,
      h: 0.45,
      fontSize: 14,
      bold: true,
      color: COLORS.navyDark
    });

    slide.addText(prob.desc, {
      x: posX + 0.3,
      y: posY + 0.65,
      w: 5.1,
      h: 0.9,
      fontSize: 11,
      color: COLORS.textMuted,
      lineSpacing: 15
    });

    // Impact callout
    slide.addShape('roundRect', {
      x: posX + 0.3,
      y: posY + 1.6,
      w: 5.1,
      h: 0.45,
      rectRadius: 0.06,
      fill: { color: 'FEF2F2' }
    });
    slide.addText(`Impact: ${prob.impact}`, {
      x: posX + 0.4,
      y: posY + 1.6,
      w: 4.9,
      h: 0.45,
      fontSize: 9.5,
      bold: true,
      color: '991B1B',
      valign: 'middle'
    });
  });
}

// ==========================================
// SLIDE 4: THE SOLUTION - ADDIS MAED ECOSYSTEM
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'The Solution: A Holistic Digital Community Ecosystem', 'Integrated Platform', 'One comprehensive platform unifying discovery, events, culture, and networking.');

  const solutions = [
    {
      title: 'Geospatial Place Discovery',
      color: COLORS.blue,
      items: ['OpenStreetMap verified locations', 'Dynamic neighborhood filters', 'Photos, ratings & user reviews', 'Direct contact & location routing']
    },
    {
      title: 'Smart Events Aggregator',
      color: COLORS.emerald,
      items: ['Curated Addis Ababa events calendar', 'AI automated event flyer extraction', 'Instant bookmarking & reminders', 'RSVP & attendee networking']
    },
    {
      title: 'Ethiopian Cultural Lounge',
      color: COLORS.amber,
      items: ['Scheduled "Joke Time" (ቀልድና ጨዋታ)', 'Daily interactive cultural quizzes', 'Community upvoting & comedy hall of fame', 'Amharic/English bilingual support']
    },
    {
      title: 'Hyperlocal Social Networking',
      color: COLORS.purple,
      items: ['Topic-based interest circles', 'Local discussions & Q&A forum', 'Verified host/creator badges', 'Direct messaging & community feed']
    }
  ];

  solutions.forEach((sol, idx) => {
    const cardX = 0.8 + idx * 3.0;
    slide.addShape('roundRect', {
      x: cardX,
      y: 1.9,
      w: 2.75,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 }
    });

    slide.addShape('rect', {
      x: cardX,
      y: 1.9,
      w: 2.75,
      h: 0.12,
      fill: { color: sol.color }
    });

    slide.addText(sol.title, {
      x: cardX + 0.2,
      y: 2.15,
      w: 2.35,
      h: 0.65,
      fontSize: 14,
      bold: true,
      color: COLORS.navyDark,
      lineSpacing: 18
    });

    let curY = 2.95;
    sol.items.forEach((item) => {
      slide.addShape('ellipse', {
        x: cardX + 0.2,
        y: curY + 0.08,
        w: 0.09,
        h: 0.09,
        fill: { color: sol.color },
        line: { color: sol.color }
      });

      slide.addText(item, {
        x: cardX + 0.38,
        y: curY,
        w: 2.2,
        h: 0.7,
        fontSize: 11,
        color: COLORS.textDark,
        lineSpacing: 15
      });
      curY += 0.82;
    });
  });
}

// ==========================================
// SLIDE 5: SERVICE FEATURES - PLACES & EVENTS
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Feature Deep-Dive: Discovery & Events', 'Service Features', 'Providing seamless utility and high-frequency engagement.');

  // Left Column: Places Discovery
  slide.addShape('roundRect', {
    x: 0.8,
    y: 1.9,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.white },
    line: { color: COLORS.blue, width: 1.5 }
  });

  slide.addShape('roundRect', {
    x: 1.1,
    y: 2.1,
    w: 5.1,
    h: 0.45,
    rectRadius: 0.06,
    fill: { color: COLORS.blueLight }
  });
  slide.addText('Hyperlocal Places & OpenStreetMap', {
    x: 1.1,
    y: 2.1,
    w: 5.1,
    h: 0.45,
    fontSize: 13,
    bold: true,
    color: COLORS.blue,
    align: 'center',
    valign: 'middle'
  });

  const placeFeatures = [
    { title: 'Interactive Map & Geolocation', desc: 'Browse places across Bole, Kazanchis, Piassa, Sarbet and more with distance calculation.' },
    { title: 'Rich Categorization', desc: 'Specialized tags for Traditional Coffee, Habesha Cuisine, Co-working, Nightlife, and Art Galleries.' },
    { title: 'Community Verified Details', desc: 'Crowdsourced verification of operating hours, phone numbers, Wi-Fi availability, and price tiers.' },
    { title: 'Photo Galleries & Menus', desc: 'Visual showcases allowing businesses to highlight their best offerings directly to nearby patrons.' }
  ];

  placeFeatures.forEach((feat, idx) => {
    const fY = 2.75 + idx * 0.95;
    slide.addText(`✔ ${feat.title}`, {
      x: 1.1,
      y: fY,
      w: 5.1,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: COLORS.navyDark
    });
    slide.addText(feat.desc, {
      x: 1.3,
      y: fY + 0.28,
      w: 4.9,
      h: 0.6,
      fontSize: 10.5,
      color: COLORS.textMuted,
      lineSpacing: 14
    });
  });

  // Right Column: Events Engine
  slide.addShape('roundRect', {
    x: 6.8,
    y: 1.9,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.white },
    line: { color: COLORS.emerald, width: 1.5 }
  });

  slide.addShape('roundRect', {
    x: 7.1,
    y: 2.1,
    w: 5.1,
    h: 0.45,
    rectRadius: 0.06,
    fill: { color: COLORS.emeraldLight }
  });
  slide.addText('Intelligent Events Engine', {
    x: 7.1,
    y: 2.1,
    w: 5.1,
    h: 0.45,
    fontSize: 13,
    bold: true,
    color: COLORS.emerald,
    align: 'center',
    valign: 'middle'
  });

  const eventFeatures = [
    { title: 'AI-Powered Flyer Extraction', desc: 'Automated optical/AI ingestion of event flyers to extract dates, venues, organizers, and pricing.' },
    { title: 'Categorized City Calendar', desc: 'Conferences, live concerts, cultural festivals, tech meetups, and networking sessions in one timeline.' },
    { title: 'One-Tap RSVP & Calendar Sync', desc: 'Save events directly to Google/Apple calendars with automated notification reminders.' },
    { title: 'Organizer Dashboard', desc: 'Self-service analytics for creators to track views, RSVPs, and broadcast updates to attendees.' }
  ];

  eventFeatures.forEach((feat, idx) => {
    const fY = 2.75 + idx * 0.95;
    slide.addText(`✔ ${feat.title}`, {
      x: 7.1,
      y: fY,
      w: 5.1,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: COLORS.navyDark
    });
    slide.addText(feat.desc, {
      x: 7.3,
      y: fY + 0.28,
      w: 4.9,
      h: 0.6,
      fontSize: 10.5,
      color: COLORS.textMuted,
      lineSpacing: 14
    });
  });
}

// ==========================================
// SLIDE 6: SERVICE FEATURES - CULTURE & JOKE TIME
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Feature Deep-Dive: Joke Time (ቀልድና ጨዋታ) & Quizzes', 'Entertainment & Culture', 'Unique local cultural flavor driving viral retention and community delight.');

  // Top Feature Callout: Joke Time
  slide.addShape('roundRect', {
    x: 0.8,
    y: 1.9,
    w: 11.7,
    h: 2.3,
    rectRadius: 0.1,
    fill: { color: COLORS.white },
    line: { color: COLORS.amber, width: 1.5 }
  });

  slide.addShape('roundRect', {
    x: 1.1,
    y: 2.1,
    w: 3.2,
    h: 0.4,
    rectRadius: 0.06,
    fill: { color: COLORS.amberLight }
  });
  slide.addText('FEATURE SPOTLIGHT: "JOKE TIME" (ቀልድና ጨዋታ)', {
    x: 1.1,
    y: 2.1,
    w: 3.2,
    h: 0.4,
    fontSize: 9.5,
    bold: true,
    color: COLORS.amber,
    align: 'center',
    valign: 'middle'
  });

  slide.addText('Scheduled Community Humor Sessions & Daily Comedy Hall of Fame', {
    x: 4.5,
    y: 2.1,
    w: 7.5,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: COLORS.navyDark,
    valign: 'middle'
  });

  const jokeSteps = [
    { title: '1. Admin Scheduled Windows', desc: 'Opening times set (e.g. 7:00 PM – 10:00 PM) creating anticipation and appointment viewing.' },
    { title: '2. Community Submissions', desc: 'Users join the active session, share original jokes, funny stories, and anecdotes in Amharic & English.' },
    { title: '3. Real-Time Reactions', desc: 'Participants react, like, and comment with instant humor badges (መሳቂያ, ምርጥ, አሪፍ).' },
    { title: '4. High-Rating Joke of the Day', desc: 'When the window closes, highest engagement jokes are automatically crowned on the daily leaderboard.' }
  ];

  jokeSteps.forEach((st, idx) => {
    const stX = 1.1 + idx * 2.8;
    slide.addShape('roundRect', {
      x: stX,
      y: 2.65,
      w: 2.6,
      h: 1.35,
      rectRadius: 0.08,
      fill: { color: COLORS.bgLight },
      line: { color: COLORS.cardBorder, width: 1 }
    });
    slide.addText(st.title, {
      x: stX + 0.15,
      y: 2.75,
      w: 2.3,
      h: 0.4,
      fontSize: 10.5,
      bold: true,
      color: COLORS.amber
    });
    slide.addText(st.desc, {
      x: stX + 0.15,
      y: 3.2,
      w: 2.3,
      h: 0.75,
      fontSize: 9.5,
      color: COLORS.textMuted,
      lineSpacing: 13
    });
  });

  // Bottom Card: Daily Ethiopian Knowledge Quizzes
  slide.addShape('roundRect', {
    x: 0.8,
    y: 4.4,
    w: 11.7,
    h: 2.3,
    rectRadius: 0.1,
    fill: { color: COLORS.white },
    line: { color: COLORS.purple, width: 1.5 }
  });

  slide.addShape('roundRect', {
    x: 1.1,
    y: 4.6,
    w: 3.2,
    h: 0.4,
    rectRadius: 0.06,
    fill: { color: COLORS.purpleLight }
  });
  slide.addText('FEATURE SPOTLIGHT: ETHIOPIAN TRIVIA & QUIZZES', {
    x: 1.1,
    y: 4.6,
    w: 3.2,
    h: 0.4,
    fontSize: 9.5,
    bold: true,
    color: COLORS.purple,
    align: 'center',
    valign: 'middle'
  });

  slide.addText('Interactive Knowledge Challenges Celebrating Heritage & History', {
    x: 4.5,
    y: 4.6,
    w: 7.5,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: COLORS.navyDark,
    valign: 'middle'
  });

  const quizSteps = [
    { title: 'Curated Categories', desc: 'History, geography, culture, sports, music, and Addis Ababa city lore trivia.' },
    { title: 'Dynamic Multi-Choice', desc: 'Timed questions with explanatory cultural trivia after each answer to foster learning.' },
    { title: 'Leaderboards & Badges', desc: 'Weekly rankings rewarding top scholars, building friendly neighborhood bragging rights.' },
    { title: 'Sponsored Quizzes', desc: 'Brands sponsor trivia challenges with real-world vouchers (free coffee, dinner discounts).' }
  ];

  quizSteps.forEach((st, idx) => {
    const stX = 1.1 + idx * 2.8;
    slide.addShape('roundRect', {
      x: stX,
      y: 5.15,
      w: 2.6,
      h: 1.35,
      rectRadius: 0.08,
      fill: { color: COLORS.bgLight },
      line: { color: COLORS.cardBorder, width: 1 }
    });
    slide.addText(st.title, {
      x: stX + 0.15,
      y: 5.25,
      w: 2.3,
      h: 0.4,
      fontSize: 10.5,
      bold: true,
      color: COLORS.purple
    });
    slide.addText(st.desc, {
      x: stX + 0.15,
      y: 5.7,
      w: 2.3,
      h: 0.75,
      fontSize: 9.5,
      color: COLORS.textMuted,
      lineSpacing: 13
    });
  });
}

// ==========================================
// SLIDE 7: HOW IT SUPPORTS CUSTOMERS (STAKEHOLDER VALUE)
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'How Addis Maed Supports Customers & Stakeholders', 'Customer Value Proposition', 'Tailored benefits engineered for each participant across our community.');

  const stakeholders = [
    {
      group: 'Citizens & Everyday Users',
      badgeColor: COLORS.blue,
      badgeBg: COLORS.blueLight,
      benefits: [
        'All-in-one local guide: Discover weekend events, top cafes, and hidden city gems without endless searching.',
        'Meaningful community connection: Discuss local neighborhood topics, make friends, and enjoy daily comedy & quizzes.',
        'Saved time & trusted decisions: Verified reviews and directions eliminate fake info and wasted trips.'
      ]
    },
    {
      group: 'Event Organizers & Creators',
      badgeColor: COLORS.emerald,
      badgeBg: COLORS.emeraldLight,
      benefits: [
        'Guaranteed local reach: Direct access to active city goers looking for live experiences.',
        'Automated visibility: Easy flyer ingestion and inclusion in high-traffic weekend recommendations.',
        'High attendance conversion: Push reminders, RSVP lists, and direct attendee announcements.'
      ]
    },
    {
      group: 'Local Businesses & Venues (SMEs)',
      badgeColor: COLORS.amber,
      badgeBg: COLORS.amberLight,
      benefits: [
        'Cost-effective digital presence: Free & low-cost listing with photos, menu, contacts, and live location.',
        'Reputation & trust building: Authentic customer reviews and badges showcasing excellence.',
        'Targeted local foot traffic: Reach customers searching within their exact sub-city or neighborhood.'
      ]
    },
    {
      group: 'Diaspora & Tourists',
      badgeColor: COLORS.purple,
      badgeBg: COLORS.purpleLight,
      benefits: [
        'Frictionless city navigation: Reliable map points and English/Amharic bilingual interface.',
        'Cultural immersion: Authentic local vibe, top cultural heritage spots, and traditional events.',
        'Real-time pulse: Stay connected to home city happenings regardless of where they are in the world.'
      ]
    }
  ];

  stakeholders.forEach((s, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const posX = 0.8 + col * 6.0;
    const posY = 1.9 + row * 2.45;

    slide.addShape('roundRect', {
      x: posX,
      y: posY,
      w: 5.7,
      h: 2.25,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 }
    });

    slide.addShape('roundRect', {
      x: posX + 0.3,
      y: posY + 0.2,
      w: 3.2,
      h: 0.35,
      rectRadius: 0.06,
      fill: { color: s.badgeBg },
      line: { color: s.badgeColor, width: 1 }
    });
    slide.addText(s.group.toUpperCase(), {
      x: posX + 0.3,
      y: posY + 0.2,
      w: 3.2,
      h: 0.35,
      fontSize: 9.5,
      bold: true,
      color: s.badgeColor,
      align: 'center',
      valign: 'middle'
    });

    let bY = posY + 0.65;
    s.benefits.forEach((b) => {
      slide.addShape('ellipse', {
        x: posX + 0.35,
        y: bY + 0.08,
        w: 0.08,
        h: 0.08,
        fill: { color: s.badgeColor },
        line: { color: s.badgeColor }
      });
      slide.addText(b, {
        x: posX + 0.5,
        y: bY,
        w: 4.9,
        h: 0.48,
        fontSize: 10,
        color: COLORS.textDark,
        lineSpacing: 13
      });
      bY += 0.5;
    });
  });
}

// ==========================================
// SLIDE 8: TECHNICAL ARCHITECTURE & RELIABILITY
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Technology Architecture & Reliability', 'Engineering Rigor', 'Built on a proven, production-grade modern web stack.');

  const techCards = [
    {
      title: 'Frontend Experience',
      tech: 'React 18 + Vite + TypeScript',
      color: COLORS.blue,
      points: [
        'Blazing fast sub-second loads with Vite bundle optimization',
        'Mobile-first responsive UI crafted for Ethiopian smartphone users',
        'Modern micro-animations and accessibility standards',
        'Offline resilience & local caching for intermittent data connections'
      ]
    },
    {
      title: 'Backend API & Engine',
      tech: 'Node.js + Express + Prisma ORM',
      color: COLORS.emerald,
      points: [
        'Strict REST architecture with modular controller & routing structure',
        'Type-safe database interactions powered by Prisma ORM',
        'Secure session auth via HTTP-only encrypted cookies & JWT',
        'SMS integration (Twilio / Knock) for verified phone onboarding'
      ]
    },
    {
      title: 'Data & Infrastructure',
      tech: 'PostgreSQL 16/18 + Docker + Caddy',
      color: COLORS.purple,
      points: [
        'PostgreSQL relational schema ensuring strong ACID data integrity',
        'Containerized Docker Compose stack for zero-downtime rollouts',
        'Automated TLS/HTTPS certificate lifecycle with Caddy reverse proxy',
        'Scheduled database backups & multi-environment isolation'
      ]
    }
  ];

  techCards.forEach((tc, idx) => {
    const cardX = 0.8 + idx * 4.0;
    slide.addShape('roundRect', {
      x: cardX,
      y: 1.9,
      w: 3.7,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 }
    });

    slide.addShape('rect', {
      x: cardX,
      y: 1.9,
      w: 3.7,
      h: 0.1,
      fill: { color: tc.color }
    });

    slide.addText(tc.title, {
      x: cardX + 0.3,
      y: 2.15,
      w: 3.1,
      h: 0.35,
      fontSize: 15,
      bold: true,
      color: COLORS.navyDark
    });

    slide.addShape('roundRect', {
      x: cardX + 0.3,
      y: 2.55,
      w: 3.1,
      h: 0.35,
      rectRadius: 0.06,
      fill: { color: COLORS.bgLight }
    });
    slide.addText(tc.tech, {
      x: cardX + 0.3,
      y: 2.55,
      w: 3.1,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: tc.color,
      align: 'center',
      valign: 'middle'
    });

    let pY = 3.1;
    tc.points.forEach((pt) => {
      slide.addShape('ellipse', {
        x: cardX + 0.3,
        y: pY + 0.08,
        w: 0.08,
        h: 0.08,
        fill: { color: tc.color },
        line: { color: tc.color }
      });
      slide.addText(pt, {
        x: cardX + 0.45,
        y: pY,
        w: 2.9,
        h: 0.7,
        fontSize: 11,
        color: COLORS.textDark,
        lineSpacing: 15
      });
      pY += 0.85;
    });
  });
}

// ==========================================
// SLIDE 9: BUSINESS MODEL & SUSTAINABILITY
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bgLight };
  addSlideHeader(slide, 'Business Model & Monetization Strategy', 'Commercial Viability', 'Diverse, non-intrusive revenue streams designed for scale.');

  const streams = [
    {
      title: 'Featured Merchant Listings',
      icon: '★',
      color: COLORS.amber,
      desc: 'Restaurants, cafes, and hotels pay monthly subscriptions for prioritized search placement, promotional badges, and enriched menu showcases.'
    },
    {
      title: 'Ticketing & Event Promotion',
      icon: '🎟',
      color: COLORS.emerald,
      desc: 'Ticketing fee commission (3-5%) on paid events plus sponsored flyer slots on the weekly "What to Do in Addis" spotlight newsletter.'
    },
    {
      title: 'Brand Sponsorships in Entertainment',
      icon: '🏆',
      color: COLORS.blue,
      desc: 'Corporate sponsorship of "Joke Time" and Daily Quizzes (e.g. Telebirr, Ethiopian Airlines, ride-hailing brands) with branded trivia prizes.'
    },
    {
      title: 'Hyperlocal Targeted Ads',
      icon: '📢',
      color: COLORS.purple,
      desc: 'Neighborhood-level non-spammy banner ads allowing businesses in Bole or Kazanchis to advertise specifically to nearby active users.'
    }
  ];

  streams.forEach((st, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const posX = 0.8 + col * 6.0;
    const posY = 1.9 + row * 2.45;

    slide.addShape('roundRect', {
      x: posX,
      y: posY,
      w: 5.7,
      h: 2.25,
      rectRadius: 0.1,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 }
    });

    slide.addShape('roundRect', {
      x: posX + 0.3,
      y: posY + 0.25,
      w: 0.5,
      h: 0.5,
      rectRadius: 0.08,
      fill: { color: COLORS.bgLight },
      line: { color: st.color, width: 1 }
    });
    slide.addText(st.icon, {
      x: posX + 0.3,
      y: posY + 0.25,
      w: 0.5,
      h: 0.5,
      fontSize: 16,
      align: 'center',
      valign: 'middle'
    });

    slide.addText(st.title, {
      x: posX + 0.95,
      y: posY + 0.25,
      w: 4.5,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: COLORS.navyDark,
      valign: 'middle'
    });

    slide.addText(st.desc, {
      x: posX + 0.3,
      y: posY + 0.9,
      w: 5.1,
      h: 1.1,
      fontSize: 11.5,
      color: COLORS.textMuted,
      lineSpacing: 16
    });
  });
}

// ==========================================
// SLIDE 10: ROADMAP & NEXT STEPS
// ==========================================
{
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navyDark };

  // Slide Header
  slide.addShape('roundRect', {
    x: 0.8,
    y: 0.5,
    w: 2.2,
    h: 0.32,
    rectRadius: 0.05,
    fill: { color: '1E293B' },
    line: { color: COLORS.emerald, width: 1 }
  });
  slide.addText('EXECUTION ROADMAP', {
    x: 0.8,
    y: 0.5,
    w: 2.2,
    h: 0.32,
    fontSize: 9,
    bold: true,
    color: COLORS.emerald,
    align: 'center',
    valign: 'middle'
  });

  slide.addText('Strategic Phasing & Go-to-Market', {
    x: 0.8,
    y: 0.9,
    w: 11.5,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: COLORS.white,
    valign: 'middle'
  });

  const phases = [
    {
      phase: 'Phase 1: Foundation (Current)',
      timeline: 'Q1 2026',
      color: COLORS.emerald,
      milestones: [
        'Complete Places & OpenStreetMap directory',
        'Events aggregator with AI extraction',
        'Scheduled Joke Time & Daily Quizzes',
        'Pilot launch in Bole & Kazanchis districts'
      ]
    },
    {
      phase: 'Phase 2: Scale & Creator Ecosystem',
      timeline: 'Q2 - Q3 2026',
      color: COLORS.blue,
      milestones: [
        'Live streaming capabilities for creators & events',
        'Native iOS & Android PWA app packaging',
        'Merchant claim & verified portal self-service',
        'Expansion to Hawassa, Bahir Dar & Adama'
      ]
    },
    {
      phase: 'Phase 3: Commerce & Super-App',
      timeline: 'Q4 2026+',
      color: COLORS.amber,
      milestones: [
        'Telebirr, CBE Birr & Chapa in-app checkout',
        'Direct table reservations & food ordering links',
        'Diaspora gift vouchers & local experiences',
        'AI personalized neighborhood concierge'
      ]
    }
  ];

  phases.forEach((ph, idx) => {
    const cardX = 0.8 + idx * 4.0;
    slide.addShape('roundRect', {
      x: cardX,
      y: 1.8,
      w: 3.7,
      h: 4.0,
      rectRadius: 0.1,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 }
    });

    slide.addShape('rect', {
      x: cardX,
      y: 1.8,
      w: 3.7,
      h: 0.08,
      fill: { color: ph.color }
    });

    slide.addText(ph.timeline.toUpperCase(), {
      x: cardX + 0.3,
      y: 2.05,
      w: 3.1,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: ph.color
    });

    slide.addText(ph.phase, {
      x: cardX + 0.3,
      y: 2.3,
      w: 3.1,
      h: 0.5,
      fontSize: 13,
      bold: true,
      color: COLORS.white
    });

    let mY = 2.95;
    ph.milestones.forEach((m) => {
      slide.addShape('ellipse', {
        x: cardX + 0.3,
        y: mY + 0.08,
        w: 0.08,
        h: 0.08,
        fill: { color: ph.color },
        line: { color: ph.color }
      });
      slide.addText(m, {
        x: cardX + 0.45,
        y: mY,
        w: 2.9,
        h: 0.6,
        fontSize: 10.5,
        color: '94A3B8',
        lineSpacing: 14
      });
      mY += 0.68;
    });
  });

  // Bottom CTA Bar
  slide.addShape('roundRect', {
    x: 0.8,
    y: 6.0,
    w: 11.7,
    h: 0.85,
    rectRadius: 0.08,
    fill: { color: COLORS.emerald }
  });

  slide.addText('Ready to redefine Ethiopia’s community digital experience? Let’s partner and build Addis Maed.', {
    x: 1.1,
    y: 6.0,
    w: 8.5,
    h: 0.85,
    fontSize: 13,
    bold: true,
    color: COLORS.white,
    valign: 'middle'
  });

  slide.addText('Contact: info@addismaed.et', {
    x: 9.6,
    y: 6.0,
    w: 2.7,
    h: 0.85,
    fontSize: 12,
    bold: true,
    color: COLORS.white,
    align: 'right',
    valign: 'middle'
  });
}

// Generate the PPTX File
const outputPath = path.resolve(__dirname, 'Addis_Maed_CommunityHub_Service_Proposal.pptx');

pptx.writeFile({ fileName: outputPath })
  .then((fileName) => {
    console.log(`SUCCESS: Presentation generated at: ${fileName}`);
  })
  .catch((err) => {
    console.error('Error generating presentation:', err);
    process.exit(1);
  });
