/**
 * Nội dung blog tĩnh (demo). Sau này có thể thay bằng Firestore/CMS.
 * @typedef {{ slug: string, date: string, readMinutes: number, category: { vi: string, en: string }, title: { vi: string, en: string }, excerpt: { vi: string, en: string }, body: { vi: string[], en: string[] }, featured?: boolean }} BlogPost
 */

/** @type {BlogPost[]} */
export const blogPosts = [
  {
    slug: 'du-lieu-xanh-cho-hoc-duong',
    date: '2026-04-18',
    readMinutes: 5,
    featured: true,
    category: { vi: 'Công nghệ & môi trường', en: 'Tech & environment' },
    title: {
      vi: 'Dữ liệu xanh cho học đường: vì sao việc đo lường lại quan trọng?',
      en: 'Green data for schools: why measurement matters',
    },
    excerpt: {
      vi: 'Khi mỗi cây trồng được ghi nhận, cộng đồng học sinh thấy rõ tác động của mình — và có thêm động lực để tiếp tục.',
      en: 'When every planted tree is recorded, student communities see their impact clearly—and stay motivated to keep going.',
    },
    body: {
      vi: [
        'Trong các hoạt động môi trường ở trường, điều khó nhất không phải là “trồng thêm bao nhiêu cây”, mà là duy trì sự chú ý và niềm tin rằng hành động nhỏ cũng có ý nghĩa. Plant for Change hướng tới một cách tiếp cận dựa trên dữ liệu: ghi nhận vị trí, loại cây, thời điểm và (khi có) hình ảnh theo thời gian.',
        'Dữ liệu không thay thế cảm xúc hay kết nối con người — nhưng nó giúp câu chuyện trở nên minh bạch. Khi một lớp, một khối hay một câu lạc bộ nhìn thấy mảng xanh của mình trên bản đồ, họ dễ chia sẻ hơn với phụ huynh, nhà trường và bạn bè.',
        'Chúng tôi tin rằng học sinh xứng đáng có công cụ gọn nhẹ, an toàn và dễ hiểu để “khoe” đóng góp thật, tránh phô trương số ảo. Đó là lý do nền tảng ưu tiên trải nghiệm rõ ràng: tạo sự kiện, tham gia, cập nhật tiến độ — mỗi bước đều có thể kiểm chứng.',
        'Trong thời gian tới, blog sẽ chia sẻ thêm về cách đọc bản đồ sự kiện, gợi ý tổ chức buổi trồng cây an toàn, và những câu chuyện từ cộng đồng. Cảm ơn bạn đã đồng hành.',
      ],
      en: [
        'In school environmental work, the hardest part is not “how many more trees to plant,” but sustaining attention and belief that small actions matter. Plant for Change takes a data-informed approach: recording location, species, timing, and (when possible) photos over time.',
        'Data does not replace emotion or human connection—but it makes the story transparent. When a class or club sees their green footprint on a map, it is easier to share with families, teachers, and friends.',
        'We believe students deserve lightweight, safe, and clear tools to show real contributions—not vanity numbers. That is why the platform prioritizes clarity: create events, join, post updates—each step verifiable.',
        'Soon this blog will cover reading the event map, tips for safe planting days, and stories from the community. Thank you for being here.',
      ],
    },
  },
  {
    slug: 'hanh-trinh-plant-for-change-2026',
    date: '2026-03-02',
    readMinutes: 4,
    category: { vi: 'Cộng đồng', en: 'Community' },
    title: {
      vi: 'Hành trình Plant for Change: từ ý tưởng đến bản đồ sự kiện',
      en: 'The Plant for Change journey: from idea to the event map',
    },
    excerpt: {
      vi: 'Một nền tảng nhỏ, xuất phát từ mong muốn kết nối học sinh yêu môi trường với công nghệ và dữ liệu có trách nhiệm.',
      en: 'A small platform born from connecting students who care about the environment with responsible tech and data.',
    },
    body: {
      vi: [
        'Plant for Change bắt đầu từ câu hỏi đơn giản: làm sao để những buổi trồng cây ở trường không chỉ “đẹp trong ngày”, mà còn để lại dấu vết tích cực có thể theo dõi theo thời gian?',
        'Chúng tôi thử nghiệm với bản đồ, biểu mẫu sự kiện, và luồng duyệt để đảm bảo thông tin hiển thị công khai là đáng tin. Mỗi vòng phản hồi từ bạn bè, thầy cô và tình nguyện viên đều giúp sản phẩm “bớt rườm rà, thêm thực”.',
        'Hôm nay, bạn có thể khám phá sự kiện trên bản đồ, đăng ký tham gia, hoặc tự tổ chức một buổi trồng cây nhỏ. Chúng tôi rất mong nhận được ý kiến của bạn qua trang liên hệ hoặc Facebook.',
      ],
      en: [
        'Plant for Change started with a simple question: how can school tree-planting days be more than “pretty for one afternoon”—and leave a positive trace you can follow over time?',
        'We experimented with maps, event forms, and review flows so public information stays trustworthy. Every round of feedback from peers, teachers, and volunteers helped make the product “less noise, more substance.”',
        'Today you can explore events on the map, join one, or host a small planting session. We would love your thoughts via the contact page or Facebook.',
      ],
    },
  },
  {
    slug: '5-goi-y-truoc-ngay-trong-cay',
    date: '2026-02-10',
    readMinutes: 6,
    category: { vi: 'Hướng dẫn', en: 'Guides' },
    title: {
      vi: '5 gợi ý trước ngày trồng cây cùng lớp',
      en: 'Five tips before a class tree-planting day',
    },
    excerpt: {
      vi: 'Chuẩn bị nhẹ nhàng giúp buổi hoạt động an toàn, vui và để lại ấn tượng tốt với mọi người.',
      en: 'Light preparation keeps the day safe, fun, and memorable for everyone.',
    },
    body: {
      vi: [
        'Kiểm tra dự báo thời tiết và có phương án khi trời mưa nhẹ: mái che, đổi khung giờ ngắn, hoặc hoạt động nhóm trong nhà (ghi nhận cây giống, phân loại dụng cụ).',
        'Chuẩn bị găng tay, khẩu trang (nếu cần), nước uống và túi rác nhỏ — gọn trong một khu vực “trạm hậu cần” để học sinh dễ tìm.',
        'Phân vai rõ ràng: nhóm đào hố, nhóm tưới nước, nhóm chụp ảnh minh bạch (xin phép khi đăng hình có mặt người).',
        'Nhắc nhở quy tắc an toàn: giày kín mũi, không chạy trong khu vực có cuốc/xẻng, giữ khoảng cách khi nhấc cây.',
        'Cuối buổi, dành 10 phút để cả lớp cùng nhìn bản đồ hoặc biểu đồ mục tiêu — để mọi người thấy mình là một phần của con số lớn hơn.',
      ],
      en: [
        'Check the weather and have a light rain plan: shelter, a shorter time window, or indoor tasks (labeling seedlings, sorting tools).',
        'Prepare gloves, masks if needed, drinking water, and small trash bags—keep a simple “logistics corner” so students can find things fast.',
        'Assign roles: digging, watering, and a respectful photo team (ask before posting faces).',
        'Reinforce safety: closed shoes, no running where tools are used, spacing when lifting saplings.',
        'End with 10 minutes looking at the map or targets together—so everyone sees they are part of a bigger number.',
      ],
    },
  },
]

export function getAllBlogPosts() {
  return [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getBlogPostBySlug(slug) {
  return blogPosts.find((p) => p.slug === slug) ?? null
}

export function getFeaturedPost() {
  return blogPosts.find((p) => p.featured) ?? blogPosts[0]
}
