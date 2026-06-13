import type { EmailDraft, EmailTemplate, Newsletter, ReportData } from "../types/Types";

export const MOCK_NEWSLETTERS: Newsletter[] = [
  {
    id: 1,
    title: "Copy This Web Story Training Will...",
    subtitle: "Copy This Web Story Training Will...",
    date: "12.05.23 09:04AM",
    opened: "11.45%",
    clicked: "23.11%",
    status: "Complete",
  },
  {
    id: 2,
    title: "Copy This Web Story Training Will...",
    subtitle: "Copy This Web Story Training Will...",
    date: "12.05.23 09:04AM",
    opened: "11.45%",
    clicked: "23.11%",
    status: "Complete",
  },
  {
    id: 3,
    title: "This Web Story Training Will...",
    subtitle: "This Web Story Training Will...",
    date: "12.05.23 09:04AM",
    opened: "13.45%",
    clicked: "29.12%",
    status: "Sending",
  },
  {
    id: 4,
    title: "Update on your GMB Listing",
    subtitle: "Update on your GMB Listing",
    date: "12.05.23 09:04AM",
    opened: "45.30%",
    clicked: "22.29%",
    status: "Scheduled",
  },
];

export const TEMPLATE_COLORS = [
  "#e8f0fe", "#dbeafe", "#ede9fe", "#fce7f3", "#ecfdf5", "#fef3c7",
];

export const MOCK_TEMPLATES: EmailTemplate[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: `Template ${i + 1}`,
  thumbnail: TEMPLATE_COLORS[i % TEMPLATE_COLORS.length],
}));

export const MOCK_DRAFTS: EmailDraft[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  title: "Copy This Web Story Training Will...",
  thumbnail: TEMPLATE_COLORS[i % TEMPLATE_COLORS.length],
}));

export const MOCK_REPORT: ReportData = {
  subject: "Website Design Proposal",
  sentAt: "02/19/2023 9:53 PM",
  deliveryRate: 100,
  opened: 893,
  clicked: 1340,
  unsubscribed: 10,
  recipients: 9080,
  stopDate: "12/09/25",
  stopTime: "06:56",
  chart: [
    { time: "9:00AM", opens: 20, clicks: 10 },
    { time: "12:00PM", opens: 80, clicks: 40 },
    { time: "3:00PM", opens: 200, clicks: 120 },
    { time: "6:00PM", opens: 9000, clicks: 5000 },
    { time: "9:00PM", opens: 300, clicks: 180 },
    { time: "12:00AM", opens: 150, clicks: 90 },
    { time: "3:00AM", opens: 400, clicks: 200 },
    { time: "6:00AM", opens: 600, clicks: 350 },
  ],
  recipientList: [
    { id: 1, name: "Chris beauty hair salon", email: "example@yourdomain.com", opens: 22, clicked: "Join Membership plan" },
    { id: 2, name: "Chris beauty hair salon", email: "example@yourdomain.com", opens: 33 },
    { id: 3, name: "Chris beauty hair salon", email: "example@yourdomain.com", opens: 33 },
    { id: 4, name: "Chris beauty hair salon", email: "example@yourdomain.com", opens: 2 },
    { id: 5, name: "Chris beauty hair salon", email: "example@yourdomain.com", opens: 10 },
  ],
};

export const AI_AGENTS = [
  "Spam-Check Agent", "Trend Spotter", "Conversion Agent", "Welcome Sequence Agent",
  "Drip Campaign Agent", "Follow-Up Agent", "Blog Writer Agent", "Ad Copy Agent",
  "Chat Support Agent", "Feedback Analyzer", "Upsell Agent", "Storytelling Agent",
  "Visual Asset Agent", "Quote/Stat Finder", "Emoji Stylist", "GDPR Agent",
  "Brand Voice Guardian", "Data Privacy Agent", "CTA Agent", "Re-Engagement Agent",
  "Email Copywriter",
];

export const BUSINESS_TYPES = [
  "E-commerce / Online Store", "Restaurant / Café / Bar",
  "Health & Fitness (Gyms, Trainers, Wellness Coaches)",
  "Beauty & Personal Care (Salons, Spas, Cosmetics)", "Real Estate",
  "Travel & Tourism", "Education & Online Courses", "Non-Profit / Charity",
  "Coaching / Consulting (Business, Life, Career, etc.)",
  "Event Planning / Entertainment", "Technology / SaaS / Software",
  "Finance / Accounting / Insurance", "Marketing / Advertising Agency",
  "Legal / Law Firms", "Healthcare / Medical Practice",
  "Photography / Videography", "Creative Services (Designers, Writers, Artists)",
  "Hospitality (Hotels, Lodges, Resorts)", "Retail Store (Physical shop, Boutique)",
  "Automotive (Dealers, Car Services, Rentals)", "Construction / Contractors",
  "Home Services (Cleaning, Repairs, Landscaping)",
  "Food & Beverage (Packaged Goods, Bakeries, Catering)", "Fashion & Apparel",
  "Jewelry & Accessories", "Music / Bands / Entertainment Talent",
  "Sports & Recreation (Clubs, Teams, Activities)",
  "Wellness & Mental Health (Therapists, Coaches, Meditation)",
  "Pet Services (Grooming, Pet Stores, Training, Vets)", "Recruitment / HR Services",
  "Manufacturing / Industrial", "Logistics & Transportation",
  "Agriculture & Farming", "Publishing / Media / Blogging",
  "Gaming / Esports / Streaming", "Crafts & Handmade Products",
  "Interior Design / Home Decor",
  "Wedding Services (Planners, Photographers, Venues)",
  "Personal Branding / Influencers", "Other (Custom Option)",
];

export const GOALS = [
  "Build Brand Awareness", "Grow Email List / Subscribers",
  "Promote Products / Services", "Increase Online Sales", "Drive In-Store Visits",
  "Announce New Products / Features", "Run Seasonal Promotions / Holiday Campaigns",
  "Offer Discounts / Deals", "Recover Abandoned Carts (E-commerce)",
  "Boost Customer Engagement", "Educate Customers (Tips, Tutorials, Guides)",
  "Establish Thought Leadership", "Send News & Company Updates",
  "Promote Events / Webinars / Workshops", "Collect Customer Feedback / Surveys",
  "Nurture Leads", "Re-Engage Inactive Subscribers", "Upsell / Cross-Sell Products",
  "Build Customer Loyalty / Retention", "Showcase Reviews & Testimonials",
  "Strengthen Community Connection", "Drive Traffic to Website / Blog",
  "Encourage Social Media Follows", "Fundraising / Donations (Non-Profits)",
  "Other (Custom Goal)",
];

export const TONES = [
  "Professional / Formal", "Casual / Friendly", "Witty / Humorous",
  "Inspirational / Motivational", "Educational / Informative",
  "Storytelling / Relatable", "Luxury / Premium", "Bold / Confident",
  "Empathetic / Supportive", "Minimal / Straightforward", "Playful / Youthful",
  "Persuasive / Sales-Oriented", "Urgent / Exciting", "Community / Inclusive",
  "Other (Custom Tone)",
];

export const STOP_POST_OPTIONS = [
  "After 1 campaign", "After 2 campaigns", "After 4 campaigns",
  "After 10 campaigns", "Never",
];

export const FREQUENCY_UNITS = ["Hour", "Day", "Week", "Month", "Yearly"];

export const SENDER_NAMES = ["Mandem tooneet", "Jamson Rason", "John Doe"];