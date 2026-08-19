module.exports = async (req, res) => {
    const { type, id } = req.query;

    res.setHeader('Vary', 'User-Agent');

    if (!id) {
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = /bot|facebook|whatsapp|telegram|viber|skype|twitter|discord|linkedin|slack|pinterest|applebot/i.test(userAgent);

    // توجيه الزائر الحقيقي للموقع مباشرة لفتح الوجبة
    if (!isBot) {
        res.writeHead(302, { 'Location': `/?meal=${encodeURIComponent(id)}`, 'Cache-Control': 'no-store' });
        return res.end();
    }

    const projectId = 'tata-e4855';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/meals/${id}`;

    try {
        const response = await fetch(firestoreUrl);
        const data = await response.json();

        if (!data || !data.fields) {
            throw new Error('Meal not found');
        }

        const fields = data.fields;
        const name = fields.name?.stringValue || 'وجبة شهية';
        const price = fields.price?.integerValue || fields.price?.doubleValue || '';
        const desc = fields.desc?.stringValue || 'أشهى المأكولات والسندوتشات الطازجة من مطعم طأطأ.';
        let imageUrl = fields.imageUrl?.stringValue || 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1200';

        // ضبط أبعاد الصورة لـ Cloudinary لمقاس المشاركة المثالي 1200x630
        if (imageUrl.includes('res.cloudinary.com') && imageUrl.includes('/upload/')) {
            let parts = imageUrl.split('/upload/');
            let rawEnd = parts[1];
            let versionMatch = rawEnd.match(/(v\d+\/.*)/);
            rawEnd = versionMatch ? versionMatch[1] : rawEnd.split('/').pop();
            imageUrl = `${parts[0]}/upload/c_fill,w_1200,h_630,g_auto,q_auto,f_auto/${rawEnd}`;
        }

        const title = `🍔 ${name} | ${price} ج.م | مطعم طأطأ`;
        const fullDesc = `${desc} • اطلبها الآن عبر الموقع وواتساب 📞 01206244875`;
        const siteUrl = `https://${req.headers.host}/api/share?id=${encodeURIComponent(id)}`;

        const escapeHTML = (str) => String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        const botHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${escapeHTML(title)}</title>
    <meta property="og:type" content="restaurant.menu_item" />
    <meta property="og:title" content="${escapeHTML(title)}" />
    <meta property="og:description" content="${escapeHTML(fullDesc)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="مطعم طأطأ" />
    <meta property="og:url" content="${siteUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHTML(title)}" />
    <meta name="twitter:description" content="${escapeHTML(fullDesc)}" />
    <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
    <script>
        window.location.href = "/?meal=${encodeURIComponent(id)}";
    </script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(botHtml);

    } catch (error) {
        console.error('Share preview error:', error);
        res.writeHead(302, { 'Location': '/', 'Cache-Control': 'no-store' });
        return res.end();
    }
};
