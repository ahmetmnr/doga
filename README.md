# DOĞA - Sıfır Atık Sesli Bilgi Yarışması 🌿

OpenAI Realtime API kullanılarak geliştirilmiş, tamamen sesli bir bilgi yarışması uygulaması. DOĞA adlı sesli asistan, katılımcılarla interaktif bir şekilde Sıfır Atık Projesi hakkında yarışma yürütür.

## 🎯 Özellikler

- **Tam Sesli Etkileşim**: Tüm yarışma OpenAI Realtime API (WebRTC) üzerinden sesli yürütülür
- **Barge-in Desteği**: Kullanıcı konuşmaya başladığında TTS anında iptal edilir
- **Gürültü Dayanımı**: Echo cancellation, noise suppression ve auto gain control
- **10 Soruluk Yarışma**: Çoktan seçmeli ve açık uçlu sorular
- **Dinamik Puanlama**: Her soru farklı puan değerine sahip
- **Liderlik Tablosu**: En yüksek skorlar kaydedilir ve gösterilir
- **Serbest Soru-Cevap**: Yarışma sırasında kullanıcı farklı sorular sorabilir

## 🚀 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone [repo-url]
cd dogav4
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın
`.env.local` dosyası oluşturun:
```env
OPENAI_API_KEY=your-openai-api-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Uygulamayı Başlatın
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🎮 Kullanım

1. **Yarışmayı Başlat** butonuna tıklayın
2. DOĞA size hoş geldiniz diyecek ve bilgilerinizi soracak:
   - Ad-Soyad
   - E-posta
   - Telefon
   - SMS/Email izni
3. Ardından 10 soruluk yarışma başlayacak
4. Her soruyu sesli cevaplayın
5. DOĞA cevabınızı değerlendirecek ve puanınızı bildirecek
6. Yarışma sonunda toplam puanınız liderlik tablosuna kaydedilecek

## 🏗️ Teknik Mimari

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (Animasyonlar)
- **Lucide Icons**

### Backend API Endpoints
- `/api/realtime-token` - OpenAI Realtime API için ephemeral token
- `/api/voice/tools` - Agent tool dispatcher
- `/api/leaderboard` - Skor kaydetme ve listeleme

### Agent Tools
- `save_participant_profile` - Katılımcı bilgilerini kaydet
- `get_state` - Oyun durumunu al
- `get_active_question` - Aktif soruyu al
- `next_question` - Sonraki soruya geç
- `grade_answer` - Cevabı değerlendir
- `confirm_answer` - Düşük güvenli cevabı onayla
- `answer_user_question` - Serbest soru cevapla
- `repeat` - Son söyleneni tekrarla
- `get_score` - Mevcut puanı al
- `end_quiz` - Yarışmayı bitir

## 📁 Proje Yapısı

```
dogav4/
├── app/
│   ├── api/
│   │   ├── realtime-token/     # Token endpoint
│   │   ├── voice/tools/        # Tool dispatcher
│   │   └── leaderboard/        # Skor yönetimi
│   ├── globals.css             # Global stiller
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Ana sayfa
├── components/
│   ├── Avatar.tsx              # Sesli asistan avatarı
│   ├── QuestionPanel.tsx       # Soru gösterimi
│   ├── TranscriptPanel.tsx     # Konuşma kaydı
│   ├── ProgressBar.tsx         # İlerleme çubuğu
│   └── Leaderboard.tsx         # Liderlik tablosu
├── lib/
│   └── useRealtimeAPI.ts       # WebRTC hook
├── data/
│   ├── questions.json          # Yarışma soruları
│   └── qna.json               # Serbest sorular
└── types/
    └── quiz.ts                # TypeScript tipleri
```

## 🔊 Ses Akışı

1. **WebRTC Bağlantısı**: OpenAI Realtime API'ye peer connection kurulur
2. **Audio Stream**: Kullanıcı mikrofonu 24kHz PCM16 formatında stream edilir
3. **Server VAD**: Sunucu taraflı ses aktivite algılama ile turn detection
4. **Barge-in**: Kullanıcı konuşmaya başlayınca TTS iptal edilir
5. **Tool Calls**: Sesli komutlar araç fonksiyonlarına yönlendirilir

## 📊 Veri Yapıları

### Soru Formatı (questions.json)
```json
{
  "id": "q1",
  "type": "mcq" | "open",
  "question": "Soru metni",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct": "B",
  "openEval": {
    "keywordsAny": ["kelime1", "kelime2"],
    "regexAny": ["pattern"],
    "minHits": 1
  },
  "points": 10,
  "miniCorpus": "Ek bilgi"
}
```

### QnA Formatı (qna.json)
```json
{
  "patterns": ["soru kalıbı 1", "soru kalıbı 2"],
  "answer": "Cevap metni"
}
```

## 🛠️ Geliştirme

### Yeni Soru Ekleme
`data/questions.json` dosyasına yeni soru objeleri ekleyin.

### Ses Ayarları
`/api/realtime-token/route.ts` dosyasında:
- `voice`: Ses tipini değiştirin (alloy, echo, fable, onyx, nova, shimmer)
- `turn_detection`: VAD parametrelerini ayarlayın

### UI Özelleştirme
`tailwind.config.ts` dosyasında renk şeması ve animasyonları düzenleyin.

## 📝 Notlar

- OpenAI Realtime API preview aşamasındadır
- Mikrofon izni gereklidir
- Chrome/Edge tarayıcıları önerilir
- Stabil internet bağlantısı gerekir

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

MIT

## 🌟 Teşekkürler

- OpenAI Realtime API ekibine
- Sıfır Atık Projesi'ne katkıda bulunan herkese

---

**🌿 Sıfır Atık için El Ele!**
