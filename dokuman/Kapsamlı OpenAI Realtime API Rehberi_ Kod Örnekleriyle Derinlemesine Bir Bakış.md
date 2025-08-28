# Kapsamlı OpenAI Realtime API Rehberi: Kod Örnekleriyle Derinlemesine Bir Bakış

**Yazar:** Manus AI
**Tarih:** 28 Ağustos 2025

## 1. Giriş ve Genel Bakış

Günümüzün yapay zeka (AI) uygulamaları, kullanıcılarla daha doğal ve akıcı etkileşimler kurma yönünde hızla evrilmektedir. Geleneksel istek-yanıt (request-response) tabanlı API'ler, metin tabanlı sohbetler için yeterli olsa da, insan konuşmasının dinamik ve gerçek zamanlı doğasını yakalamakta yetersiz kalmaktadır. Kullanıcının konuşmasını bitirmesini beklemek, sesi metne dönüştürmek, bu metni bir dil modeline (LLM) göndermek ve ardından gelen metin yanıtını tekrar sese çevirmek gibi adımlardan oluşan süreç, belirgin bir gecikmeye (latency) neden olmaktadır. Bu gecikme, özellikle telefon görüşmeleri, canlı müşteri desteği veya anlık çeviri gibi uygulamalarda kullanıcı deneyimini olumsuz etkilemektedir.

OpenAI, bu zorluğun üstesinden gelmek için **Realtime API**'yi geliştirmiştir. Bu API, adından da anlaşılacağı gibi, yapay zeka ile gerçek zamanlı, düşük gecikmeli ve çok modlu (multimodal) etkileşimler kurmak için tasarlanmış devrim niteliğinde bir çözümdür. Geleneksel STT-LLM-TTS (Speech-to-Text, Large Language Model, Text-to-Speech) zincirini tek ve entegre bir akışta birleştirerek, insan benzeri akıcı konuşma deneyimleri yaratmanın önünü açar.

Bu rehber, OpenAI Realtime API'nin ne olduğunu, nasıl çalıştığını, temel özelliklerini ve kullanım alanlarını en ince ayrıntısına kadar açıklamak amacıyla hazırlanmıştır. Geliştiricilere, bu güçlü aracı kendi uygulamalarına nasıl entegre edeceklerini göstermek için kapsamlı kod örnekleri, en iyi uygulamalar (best practices) ve pratik ipuçları sunulacaktır. Rehberin sonunda, Realtime API'yi kullanarak kendi sesli asistanlarınızı, canlı transkripsiyon servislerinizi veya diğer yenilikçi ses tabanlı uygulamalarınızı geliştirmek için gerekli tüm bilgi ve donanıma sahip olacaksınız.

### 1.1. OpenAI Realtime API Nedir?

OpenAI Realtime API, geliştiricilerin **GPT-4o** ve **GPT-4o mini** gibi OpenAI'nin en gelişmiş ve doğal olarak çok modlu modelleriyle düşük gecikmeli, konuşma tabanlı etkileşimler kurmasını sağlayan bir uygulama programlama arayüzüdür. API, ses girişlerini ve çıkışlarını doğrudan akış (streaming) olarak işleyerek, geleneksel yöntemlerdeki gecikmeleri ortadan kaldırır ve daha doğal, kesintisiz diyaloglar ermöglicht. [1]

Bu API'nin temel felsefesi, konuşmayı bir dizi ayrık adımdan ziyade sürekli bir etkileşim olarak ele almaktır. Kullanıcı konuşmaya başladığı andan itibaren ses verisi API'ye akmaya başlar. API, bu sesi anında işleyerek canlı transkripsiyonlar üretir, kullanıcının niyetini anlar ve daha kullanıcı cümlesini bitirmeden bile bir yanıt formüle etmeye başlayabilir. Yanıt hazır olduğunda, bu yanıt da metin olarak değil, doğrudan sentezlenmiş ses verisi olarak istemciye geri akıtılır. Bu süreç, insan konuşmasının karşılıklı ve dinamik doğasını taklit ederek son derece akıcı bir deneyim sunar.

### 1.2. Temel Özellikler ve Avantajlar

Realtime API, onu diğer ses işleme çözümlerinden ayıran bir dizi güçlü özellik sunar:

*   **Düşük Gecikme (Low Latency):** En belirgin avantajıdır. Sesin tek bir entegre akışta işlenmesi, milisaniyelerle ölçülen yanıt süreleri sağlar. Bu, telefon görüşmeleri gibi gecikmeye duyarlı uygulamalar için kritiktir.
*   **Doğal Çok Modluluk (Native Multimodality):** API, sadece ses ve metni değil, aynı zamanda gelecekte görüntü gibi diğer modaliteleri de işleyebilecek şekilde tasarlanmıştır. GPT-4o gibi modellerin doğal çok modlu yeteneklerini tam olarak kullanır.
*   **Gerçek Zamanlı Transkripsiyon:** Kullanıcı konuşurken sesini canlı olarak metne dönüştürür. Bu özellik, canlı altyazı oluşturma veya konuşma içeriğini anında analiz etme gibi uygulamalar için kullanılabilir.
*   **Akıllı Kesme (Intelligent Interruption):** Kullanıcılar, asistanın konuşmasını istedikleri zaman keserek araya girebilirler. API, bu kesintiyi akıllıca yöneterek konuşmanın doğal akışını bozmaz.
*   **Dinamik Ses Üretimi:** Asistanın yanıtları, statik ses dosyaları yerine gerçek zamanlı olarak sentezlenir. Bu, daha dinamik ve duruma uygun tonlamalarla konuşan bir asistan anlamına gelir.
*   **Fonksiyon Çağırma (Function Calling):** Konuşma sırasında harici araçları ve API'leri çağırma yeteneği. Örneğin, bir kullanıcı 







## 2. Temel Kavramlar

OpenAI Realtime API'sini etkili bir şekilde kullanabilmek için temelindeki bazı anahtar kavramları ve teknolojileri anlamak önemlidir. Bu bölüm, API'nin yapı taşlarını oluşturan WebRTC, WebSocket, olay güdümlü mimari (event-driven architecture) ve diğer önemli konseptleri açıklamaktadır.

### 2.1. WebRTC vs. WebSocket: Doğru Bağlantı Yöntemini Seçmek

Realtime API, istemcilerle (client) sunucu (server) arasında bağlantı kurmak için iki ana protokol sunar: WebRTC ve WebSocket. Her ikisi de gerçek zamanlı iletişimi mümkün kılsa da, farklı kullanım senaryoları için tasarlanmışlardır ve kendilerine özgü avantajlara ve dezavantajlara sahiptirler. Doğru protokolü seçmek, uygulamanızın performansı, ölçeklenebilirliği ve mimarisi üzerinde önemli bir etkiye sahip olacaktır.

#### 2.1.1. WebRTC (Web Real-Time Communication)

WebRTC, web tarayıcıları ve mobil uygulamalar arasında herhangi bir ara sunucuya veya eklentiye ihtiyaç duymadan doğrudan eşler arası (peer-to-peer) ses, video ve veri iletişimini sağlayan açık kaynaklı bir projedir. Realtime API bağlamında, **istemci tarafı (client-side) uygulamalar için şiddetle tavsiye edilen yöntemdir.** [2]

**Avantajları:**

*   **Ultra Düşük Gecikme:** Ses ve video verileri, merkezi bir sunucudan geçmek yerine doğrudan istemci ile OpenAI sunucuları arasında aktığı için mümkün olan en düşük gecikmeyi sunar. Bu, konuşma tabanlı uygulamalarda en akıcı ve doğal deneyimi sağlar.
*   **Tarayıcı Desteği:** Modern tüm web tarayıcıları (Chrome, Firefox, Safari, Edge) tarafından yerel olarak desteklenir, bu da herhangi bir ek kütüphane veya eklenti gerektirmediği anlamına gelir.
*   **Güvenlik:** İletişim, DTLS (Datagram Transport Layer Security) ve SRTP (Secure Real-time Transport Protocol) kullanılarak varsayılan olarak şifrelenir.

**Dezavantajları:**

*   **Sunucu Tarafı Karmaşıklığı:** WebRTC, doğrudan sunucu tarafı (server-side) uygulamalarda (örneğin bir Node.js veya Python backend'i) kullanıma uygun değildir. Bir istemci (tarayıcı) ile sunucu arasında bir WebRTC bağlantısı kurmak, genellikle bir sinyalizasyon (signaling) sunucusu gerektirir. Realtime API bu süreci basitleştirse de, saf WebSocket'e göre daha karmaşık bir kurulumu vardır.
*   **NAT ve Güvenlik Duvarı Sorunları:** Eşler arası doğası nedeniyle, bazı kurumsal ağlarda veya kısıtlayıcı güvenlik duvarlarının (firewall) arkasında bağlantı kurmakta zorluklar yaşanabilir. Bu sorunları aşmak için genellikle STUN (Session Traversal Utilities for NAT) ve TURN (Traversal Using Relays around NAT) sunucuları kullanılır.

**Kullanım Senaryoları:**

*   Doğrudan tarayıcıda çalışan web tabanlı sesli asistanlar.
*   Mobil uygulamalara entegre edilen konuşma arayüzleri.
*   Gerçek zamanlı sesli sohbet özellikleri sunan web uygulamaları.

#### 2.1.2. WebSocket

WebSocket, tek bir TCP bağlantısı üzerinden tam çift yönlü (full-duplex) bir iletişim kanalı sağlayan bir bilgisayar iletişim protokolüdür. Geleneksel HTTP'nin aksine, sunucunun istemciden bir istek beklemeden veri göndermesine olanak tanır. Realtime API bağlamında, **sunucudan sunucuya (server-to-server) senaryolar için idealdir.** [3]

**Avantajları:**

*   **Sunucu Tarafı Uyumluluğu:** Python, Node.js, Java, Go gibi popüler backend dilleri ve framework'leri tarafından kolayca desteklenir. Bu, Realtime API'yi mevcut backend altyapınıza entegre etmeyi kolaylaştırır.
*   **Daha Basit Kurulum:** WebRTC'ye kıyasla daha basit bir bağlantı ve kurulum sürecine sahiptir. Sinyalizasyon veya karmaşık NAT geçiş mekanizmalarına ihtiyaç duymaz.
*   **Güvenilirlik:** TCP üzerine kurulu olduğu için veri iletiminin sıralı ve güvenilir olmasını garanti eder.

**Dezavantajları:**

*   **Daha Yüksek Gecikme:** Veriler, istemci ile OpenAI arasında doğrudan akmak yerine sizin backend sunucunuz üzerinden geçer. Bu ek atlama (hop), WebRTC'ye kıyasla kaçınılmaz olarak daha yüksek bir gecikmeye neden olur. Bu gecikme birçok uygulama için kabul edilebilir olsa da, en hassas gerçek zamanlı senaryolar için ideal olmayabilir.
*   **Tarayıcıda Doğrudan Kullanım Önerilmez:** Bir WebSocket bağlantısını doğrudan bir tarayıcıdan OpenAI'ye kurmak, API anahtarınızı (API key) istemci tarafı kodda ifşa etmenizi gerektirir. Bu, ciddi bir güvenlik açığıdır. Bu nedenle, tarayıcı tabanlı uygulamalar için WebSocket kullanılacaksa, mutlaka arada bir backend sunucusu (relay server) olmalıdır.

**Kullanım Senaryoları:**

*   Telefon ağları (PSTN) ile entegre edilen sesli botlar (örneğin, Twilio Media Streams ile).
*   Mevcut bir backend uygulamasına sesli asistan özellikleri eklemek.
*   Gelen ses verileri üzerinde sunucu tarafında ek işlemler (örneğin, duygu analizi, veri loglama) yapmak istediğiniz durumlar.

| Özellik | WebRTC | WebSocket |
| :--- | :--- | :--- |
| **Önerilen Kullanım** | İstemci Tarafı (Tarayıcı, Mobil) | Sunucu Tarafı (Backend) |
| **Gecikme Süresi** | Ultra Düşük | Düşük (ancak WebRTC'den yüksek) |
| **Protokol** | UDP (genellikle), Peer-to-Peer | TCP, Client-Server |
| **Kurulum Karmaşıklığı**| Daha Yüksek (Sinyalizasyon) | Daha Düşük |
| **Güvenlik** | Varsayılan Olarak Şifreli (DTLS/SRTP) | WSS ile Şifreli (TLS) |
| **Ana Avantaj** | En Hızlı Performans | Kolay Backend Entegrasyonu |
| **Ana Dezavantaj** | Sunucu Tarafı Uygun Değil | Daha Yüksek Gecikme, Tarayıcıda Güvensiz |

### 2.2. Olay Güdümlü Mimari (Event-Driven Architecture)

Realtime API, tamamen olay güdümlü bir mimari üzerine kurulmuştur. Bu, istemci ve sunucu arasındaki tüm iletişimin **olaylar (events)** aracılığıyla gerçekleştiği anlamına gelir. Bir bağlantı kurulduktan sonra, istemci belirli eylemleri gerçekleştirmek için sunucuya olaylar gönderir (örneğin, bir metin mesajı göndermek veya oturum yapılandırmasını güncellemek) ve sunucu da işlemin çeşitli aşamaları hakkında bilgi vermek için istemciye olaylar gönderir (örneğin, bir transkripsiyonun tamamlandığını veya ses verisinin bir parçasının mevcut olduğunu bildirmek).

Bu yaklaşım, son derece esnek ve dinamik bir iletişim sağlar. Geleneksel bir API çağrısı gibi tek bir yanıt beklemek yerine, istemci sürekli olarak sunucudan gelen olayları dinler ve bunlara göre arayüzünü veya durumunu günceller. Örneğin:

*   `response.audio_transcript.delta` olayı geldikçe, ekranda canlı olarak kelime kelime transkripsiyon gösterebilirsiniz.
*   `response.audio.delta` olayı geldikçe, gelen ses verisi parçalarını bir araya getirip kesintisiz bir şekilde çalabilirsiniz.
*   `response.function_call_arguments.done` olayı geldiğinde, modelin çağırmak istediği fonksiyonu ve argümanlarını alıp ilgili işlemi gerçekleştirebilirsiniz.

Bu rehberin ilerleyen bölümlerinde, hem istemci (client) hem de sunucu (server) tarafından gönderilen ve alınan tüm önemli olay türlerini ayrıntılı olarak inceleyeceğiz.

### 2.3. Ses Akışı (Audio Streaming)

Realtime API'nin kalbinde ses akışı yeteneği yatar. Bu, ses verisinin büyük bir dosya olarak tek seferde gönderilmesi yerine, küçük parçalar (chunks) halinde sürekli olarak iletilmesi anlamına gelir. Hem kullanıcıdan API'ye (giriş) hem de API'den kullanıcıya (çıkış) ses akışı yapılır.

*   **Giriş Akışı (Input Streaming):** Kullanıcı mikrofona konuşmaya başladığında, ses verisi anında yakalanır ve küçük paketler halinde API'ye gönderilir. Bu, API'nin transkripsiyon ve anlama sürecine hemen başlamasını sağlar.
*   **Çıkış Akışı (Output Streaming):** Model bir yanıt oluşturduğunda, bu yanıtın tamamının üretilmesini beklemez. Yanıtın ilk kısımları üretilir üretilmez, ses verisi olarak sentezlenir ve istemciye geri akıtılmaya başlanır. Bu, 




## 3. Kurulum ve Başlangıç

OpenAI Realtime API ile geliştirmeye başlamadan önce, çalışma ortamınızı doğru bir şekilde kurmanız ve temel kimlik doğrulama adımlarını tamamlamanız gerekmektedir. Bu bölüm, geliştirme sürecine hızlı bir başlangıç yapmanız için gerekli tüm adımları ayrıntılı olarak açıklamaktadır.

### 3.1. Gerekli Araçlar ve Hesaplar

Başlamadan önce aşağıdaki araçlara ve hesaplara sahip olduğunuzdan emin olun:

*   **OpenAI Hesabı ve API Anahtarı:** Realtime API dahil olmak üzere tüm OpenAI API'lerine erişmek için bir OpenAI hesabına ihtiyacınız olacaktır. Hesabınızı oluşturduktan sonra, OpenAI Dashboard üzerinden bir API anahtarı (API key) oluşturmanız gerekmektedir. Bu anahtar, API'ye yaptığınız tüm isteklerde kimliğinizi doğrulamak için kullanılacaktır. API anahtarınızı güvenli bir yerde saklamanız ve asla istemci tarafı (client-side) kodda veya herkese açık repository'lerde ifşa etmemeniz çok önemlidir.
*   **Node.js ve npm (veya Yarn):** Bu rehberdeki istemci tarafı ve bazı sunucu tarafı kod örnekleri JavaScript/TypeScript ve Node.js çalışma zamanı ortamını kullanacaktır. Node.js'i resmi web sitesinden indirip kurabilirsiniz. Node.js ile birlikte gelen npm (Node Package Manager), projenizin bağımlılıklarını yönetmek için kullanılacaktır.
*   **Python (Opsiyonel, Sunucu Tarafı için):** Sunucu tarafı (backend) örnekleri için Python ve FastAPI framework'ünü kullanacağız. Eğer sunucu tarafı bir implementasyon yapmayı planlıyorsanız, Python'un güncel bir sürümünün (3.8 veya üstü) sisteminizde kurulu olması gerekmektedir.
*   **Kod Editörü:** Visual Studio Code, Sublime Text, Atom veya tercih ettiğiniz herhangi bir modern kod editörü.
*   **Git:** Kod örneklerini ve projeleri klonlamak için Git versiyon kontrol sisteminin kurulu olması faydalı olacaktır.

### 3.2. Proje Yapısını Oluşturma

Temiz ve organize bir proje yapısı, geliştirme sürecini kolaylaştırır. Hem istemci hem de sunucu tarafı kodları içerecek basit bir monorepo yapısı oluşturalım:

```bash
# Proje ana dizinini oluştur
mkdir openai-realtime-demo
cd openai-realtime-demo

# İstemci (frontend) için bir dizin oluştur (React uygulaması)
mkdir client

# Sunucu (backend) için bir dizin oluştur (Python/FastAPI)
mkdir server

# Proje ana dizininde bir package.json dosyası oluştur
npm init -y
```

Bu yapı, istemci ve sunucu kodlarını birbirinden ayrı tutarken, her ikisini de tek bir proje altında yönetmenize olanak tanır.

### 3.3. Gerekli Paketlerin Kurulumu

Şimdi, hem istemci hem de sunucu tarafı için gerekli olan temel kütüphaneleri ve paketleri kuralım.

#### 3.3.1. İstemci Tarafı (React) Kurulumu

İstemci tarafı için hızlı bir şekilde React projesi oluşturmak amacıyla Vite aracını kullanacağız. Vite, son derece hızlı bir geliştirme sunucusu ve build aracıdır.

```bash
# client dizinine git
cd client

# Vite ile yeni bir React projesi oluştur
npm create vite@latest . -- --template react

# Gerekli bağımlılıkları kur
npm install

# OpenAI Realtime API client kütüphanesini kur (WebRTC için)
# Not: Bu kütüphane henüz resmi olarak yayınlanmamış olabilir,
# bu nedenle doğrudan GitHub'dan veya alternatiflerden kurulum gerekebilir.
# Şimdilik, bu kütüphanenin temel işlevlerini kendi kodumuzda yazacağız.

# Projeyi başlatmak için:
npm run dev
```

Bu komutlar, `client` dizininde bir React uygulaması oluşturacak ve geliştirme sunucusunu `http://localhost:5173` (veya benzeri bir portta) başlatacaktır.

#### 3.3.2. Sunucu Tarafı (Python/FastAPI) Kurulumu

Sunucu tarafı için Python'un sanal ortam (virtual environment) özelliğini kullanarak bağımlılıkları izole etmek en iyi pratiktir.

```bash
# server dizinine git
cd ../server

# Sanal ortam oluştur
python -m venv venv

# Sanal ortamı aktive et
# Windows için:
# venv\Scripts\activate
# macOS/Linux için:
source venv/bin/activate

# Gerekli Python paketlerini kur
pip install fastapi "uvicorn[standard]" websockets redis python-dotenv
```

Bu komutlar, sunucu tarafı için gerekli olan FastAPI (web framework), Uvicorn (ASGI sunucusu), websockets (WebSocket istemci kütüphanesi), redis (session yönetimi için) ve python-dotenv (ortam değişkenlerini yönetmek için) paketlerini kuracaktır.

### 3.4. Ortam Değişkenlerini Ayarlama

API anahtarınız gibi hassas bilgileri doğrudan kodun içine yazmak yerine, ortam değişkenleri (environment variables) kullanarak yönetmek güvenlik açısından kritik öneme sahiptir.

#### Sunucu Tarafı (`.env` dosyası)

`server` dizini içinde `.env` adında bir dosya oluşturun ve içine aşağıdaki bilgileri girin:

```
# .env (server dizininde)

# OpenAI API Anahtarınız
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Backend API'nizi korumak için basit bir token (isteğe bağlı)
API_TOKEN="your-secret-backend-token"
```

Bu dosya, Python uygulamamız tarafından okunarak `os.getenv()` fonksiyonu aracılığıyla bu değerlere erişmemizi sağlayacaktır.

#### İstemci Tarafı (`.env.local` dosyası)

`client` dizini içinde `.env.local` adında bir dosya oluşturun. Vite, `VITE_` önekine sahip ortam değişkenlerini istemci tarafı koda otomatik olarak enjekte eder.

```
# .env.local (client dizininde)

# Backend sunucunuzun adresi
VITE_BACKEND_WEBSOCKET_URL="ws://localhost:8000"
VITE_BACKEND_API_URL="http://localhost:8000/api"

# Backend API'nize erişim için token
VITE_BACKEND_API_TOKEN="your-secret-backend-token"
```

**Önemli Not:** `OPENAI_API_KEY`'inizi **asla** istemci tarafı `.env` dosyasına koymayın. Bu, anahtarınızın tarayıcıda ifşa olmasına neden olur.

Artık geliştirme ortamınız hazır olduğuna göre, bir sonraki bölümde WebRTC ve WebSocket kullanarak OpenAI Realtime API'ye ilk bağlantımızı nasıl kuracağımızı ve temel etkileşimleri nasıl gerçekleştireceğimizi inceleyeceğiz.


inceleyeceğiz. 




## 4. WebRTC ile İstemci Tarafı Implementasyonu

WebRTC, OpenAI Realtime API ile en düşük gecikmeli ve en doğal etkileşimi sağlamak için önerilen yöntemdir, özellikle doğrudan tarayıcıda veya mobil uygulamalarda çalışan istemciler için. Bu bölüm, bir web tarayıcısından WebRTC kullanarak Realtime API'ye nasıl bağlanılacağını, ses akışının nasıl yönetileceğini ve olayların nasıl işleneceğini adım adım gösteren detaylı bir implementasyon rehberi sunmaktadır.

Bu implementasyon, doğrudan OpenAI'ye bağlanmak yerine, API anahtarını güvende tutmak için arada bir backend sunucusu üzerinden geçici bir oturum anahtarı (session token) alınmasını varsayar. Bu, üretim ortamları için en güvenli yaklaşımdır.

### 4.1. Mimarinin Genel Bakışı

İstemci tarafı WebRTC implementasyonu genellikle aşağıdaki adımları içerir:

1.  **Token Alımı:** İstemci (tarayıcı), kendi backend sunucusuna bir istek göndererek OpenAI Realtime API için kısa ömürlü bir kimlik doğrulama anahtarı (ephemeral key veya session token) talep eder.
2.  **`RTCPeerConnection` Oluşturma:** İstemci, bir `RTCPeerConnection` nesnesi oluşturur. Bu nesne, tarayıcı ile OpenAI'nin medya sunucusu arasındaki WebRTC bağlantısını temsil eder.
3.  **Medya Akışlarını Ayarlama:**
    *   **Yerel Ses (Mikrofon):** İstemci, kullanıcının mikrofonuna erişir (`navigator.mediaDevices.getUserMedia`) ve elde edilen ses akışını (audio track) `RTCPeerConnection`'a ekler. Bu, kullanıcının sesinin OpenAI'ye gönderilmesini sağlar.
    *   **Uzak Ses (Asistan):** İstemci, `RTCPeerConnection` üzerinde `ontrack` olay dinleyicisini ayarlar. OpenAI'den bir ses akışı geldiğinde, bu olay tetiklenir ve gelen akış bir `<audio>` elementine bağlanarak asistanın sesinin çalınması sağlanır.
4.  **Veri Kanalı (`DataChannel`) Oluşturma:** Ses ve video dışında yapılandırılmış veri göndermek için bir `RTCDataChannel` oluşturulur. Realtime API'de bu kanal, metin mesajları, oturum yapılandırması ve diğer kontrol olayları gibi JSON tabanlı olayları göndermek ve almak için kullanılır.
5.  **Sinyalizasyon (Signaling):**
    *   İstemci, bir "teklif" (offer) oluşturur (`pc.createOffer()`). Bu teklif, istemcinin medya yeteneklerini ve bağlantı tercihlerini içeren bir SDP (Session Description Protocol) mesajıdır.
    *   İstemci, bu SDP teklifini ve daha önce aldığı geçici anahtarı kullanarak OpenAI'nin `/v1/realtime` endpoint'ine bir HTTP POST isteği gönderir.
    *   OpenAI, bu teklife bir "cevap" (answer) ile yanıt verir. Bu cevap da bir SDP mesajıdır.
    *   İstemci, OpenAI'den gelen bu SDP cevabını alarak `pc.setRemoteDescription()` metodu ile `RTCPeerConnection` nesnesini yapılandırır.
6.  **Bağlantı Kuruldu:** Bu adımlardan sonra, WebRTC bağlantısı kurulmuş olur. Ses akışı başlar ve veri kanalı (data channel) üzerinden olaylar gönderilip alınabilir.

### 4.2. Detaylı Kod Örneği (`WebRTCClient.js`)

Aşağıda, bu adımları gerçekleştiren yeniden kullanılabilir bir JavaScript sınıfı bulunmaktadır. Bu sınıf, bağlantı mantığını soyutlayarak bir React veya başka bir frontend framework'ü içinde kolayca kullanılabilir.

```javascript
// /client/src/services/WebRTCClient.js

/**
 * OpenAI Realtime API için WebRTC istemcisi.
 * Bağlantı, medya ve olay yönetimini soyutlar.
 */
export class WebRTCClient {
  constructor(backendApiUrl, apiToken) {
    this.backendApiUrl = backendApiUrl;
    this.apiToken = apiToken;
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    this.localStream = null;

    // Olay dinleyicileri için callback'ler
    this.onConnectionStateChange = null;
    this.onDataChannelOpen = null;
    this.onDataChannelClose = null;
    this.onEventReceived = null;
    this.onRemoteTrack = null;
  }

  /**
   * Oturumu başlatır ve OpenAI'ye bağlanır.
   */
  async start() {
    if (this.peerConnection) {
      console.warn("Session is already active.");
      return;
    }

    try {
      // 1. Backend'den geçici OpenAI anahtarı al
      const ephemeralKey = await this.fetchEphemeralKey();

      // 2. RTCPeerConnection oluştur
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      this.peerConnection.onconnectionstatechange = () => {
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(this.peerConnection.connectionState);
        }
      };

      // 3. Medya akışlarını ayarla
      await this.setupLocalMedia();
      this.setupRemoteMedia();

      // 4. Veri kanalını ayarla
      this.setupDataChannel();

      // 5. Sinyalizasyon sürecini başlat
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const answerSdp = await this.exchangeSdpWithOpenAI(offer.sdp, ephemeralKey);

      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log("WebRTC session started successfully.");

    } catch (error) {
      console.error("Failed to start WebRTC session:", error);
      this.stop(); // Hata durumunda temizlik yap
      throw error;
    }
  }

  /**
   * Oturumu durdurur ve kaynakları temizler.
   */
  stop() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.audioElement) {
        this.audioElement.remove();
        this.audioElement = null;
    }
    console.log("WebRTC session stopped.");
  }

  /**
   * OpenAI'ye bir istemci olayı gönderir.
   * @param {object} event - Gönderilecek JSON olayı.
   */
  sendEvent(event) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error("Data channel is not open. Cannot send event.");
      return;
    }
    this.dataChannel.send(JSON.stringify(event));
  }

  // --- Özel (Private) Yardımcı Metotlar ---

  async fetchEphemeralKey() {
    const response = await fetch(`${this.backendApiUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ session_id: 'webrtc_session' })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch ephemeral key from backend.");
    }
    const data = await response.json();
    return data.client_secret.value; // Varsayımsal backend yanıtı
  }

  async setupLocalMedia() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  setupRemoteMedia() {
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
    document.body.appendChild(this.audioElement);

    this.peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (event.track.kind === 'audio' && event.streams[0]) {
        this.audioElement.srcObject = event.streams[0];
        if (this.onRemoteTrack) {
            this.onRemoteTrack(event.streams[0]);
        }
      }
    };
  }

  setupDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('oai-events', { ordered: true });
    this.dataChannel.onopen = () => {
      console.log("Data channel is open.");
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
    };
    this.dataChannel.onclose = () => {
      console.log("Data channel is closed.");
      if (this.onDataChannelClose) {
        this.onDataChannelClose();
      }
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const parsedEvent = JSON.parse(event.data);
        if (this.onEventReceived) {
          this.onEventReceived(parsedEvent);
        }
      } catch (e) {
        console.error("Failed to parse incoming event:", e);
      }
    };
  }

  async exchangeSdpWithOpenAI(sdp, ephemeralKey) {
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const url = `https://api.openai.com/v1/realtime?model=${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${ephemeralKey}`,
      },
      body: sdp,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SDP exchange failed: ${response.status} ${errorBody}`);
    }

    return await response.text();
  }
}
```

### 4.3. React Bileşeni ile Entegrasyon

Yukarıdaki `WebRTCClient` sınıfını bir React bileşeni içinde nasıl kullanacağımıza dair bir örnek aşağıda verilmiştir. Bu bileşen, bağlantıyı yönetmek, mesaj göndermek ve gelen olayları görüntülemek için temel bir arayüz sağlar.

```jsx
// /client/src/App.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCClient } from './services/WebRTCClient';
import './App.css';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;
const BACKEND_API_TOKEN = import.meta.env.VITE_BACKEND_API_TOKEN;

function App() {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [events, setEvents] = useState([]);
  const [inputText, setInputText] = useState('');
  const client = useRef(null);

  const logEvent = useCallback((event) => {
    setEvents(prev => [{
        id: Date.now() + Math.random(),
        ...event
    }, ...prev]);
  }, []);

  useEffect(() => {
    // Component unmount olduğunda temizlik yap
    return () => {
      if (client.current) {
        client.current.stop();
      }
    };
  }, []);

  const handleStartSession = useCallback(async () => {
    if (client.current) {
        client.current.stop();
    }

    client.current = new WebRTCClient(BACKEND_API_URL, BACKEND_API_TOKEN);

    client.current.onConnectionStateChange = (state) => {
      setConnectionState(state);
      logEvent({ type: 'system', message: `Connection state: ${state}` });
    };

    client.current.onDataChannelOpen = () => {
      logEvent({ type: 'system', message: 'Data channel opened.' });
      // Oturum yapılandırmasını gönder
      client.current.sendEvent({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful assistant named Manus. Please be friendly and concise.',
          voice: 'shimmer',
        },
      });
    };

    client.current.onEventReceived = (event) => {
      logEvent(event);
    };

    try {
      setConnectionState('connecting');
      await client.current.start();
    } catch (error) {
      logEvent({ type: 'system', message: `Error starting session: ${error.message}` });
      setConnectionState('failed');
    }
  }, [logEvent]);

  const handleStopSession = () => {
    if (client.current) {
      client.current.stop();
    }
  };

  const handleSendText = () => {
    if (inputText.trim() === '' || !client.current) return;

    const textEvent = {
        type: 'conversation.item.create',
        item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: inputText.trim() }]
        }
    };
    client.current.sendEvent(textEvent);
    logEvent(textEvent); // Giden olayı da logla

    // Yanıtı tetikle
    const responseEvent = { type: 'response.create' };
    client.current.sendEvent(responseEvent);
    logEvent(responseEvent);

    setInputText('');
  };

  return (
    <div className="App">
      <header>
        <h1>OpenAI Realtime API - WebRTC Demo</h1>
        <div className={`status ${connectionState}`}>
          Status: {connectionState}
        </div>
      </header>
      <div className="controls">
        <button onClick={handleStartSession} disabled={connectionState === 'connecting' || connectionState === 'connected'}>
          Start Session
        </button>
        <button onClick={handleStopSession} disabled={connectionState !== 'connected'}>
          Stop Session
        </button>
      </div>
      <div className="chat-interface">
        <div className="event-log">
          <h2>Event Log</h2>
          <ul>
            {events.map(e => (
              <li key={e.id} className={`event-item event-${e.type?.replace(/\./g, '-')}`}>
                <strong>{e.type}</strong>
                <pre>{JSON.stringify(e, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div>
        <div className="input-area">
          <textarea 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a message..."
            disabled={connectionState !== 'connected'}
          />
          <button onClick={handleSendText} disabled={connectionState !== 'connected' || !inputText.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
```

Bu kod örneği, WebRTC bağlantısının tüm yaşam döngüsünü yönetir: bir backend'den anahtar almaktan, medya ve veri kanallarını kurmaktan, sinyalizasyon sürecini tamamlamaktan ve son olarak olayları gönderip almaktan sorumludur. Bu modüler yaklaşım, uygulamanızın geri kalanından Realtime API'nin karmaşıklığını soyutlamanıza olanak tanır.











































































































































































































































































































































































































































































































































































































































































































































































































































































































































- [4]




## 5. WebSocket ile Sunucu Tarafı Implementasyonu

WebSocket, OpenAI Realtime API'yi mevcut bir backend altyapısına entegre etmek veya telefon ağları gibi sunucu tarafı sistemlerle bağlamak için ideal bir çözümdür. Bu yaklaşımda, sizin sunucunuz (örneğin, bir Python/FastAPI veya Node.js uygulaması) istemci (client) ile OpenAI sunucuları arasında bir aracı (proxy veya relay) görevi görür.

Bu bölüm, bir Python backend sunucusu kullanarak WebSocket üzerinden Realtime API'ye nasıl bağlanılacağını, istemci bağlantılarının nasıl yönetileceğini ve olayların iki yönlü olarak nasıl aktarılacağını detaylandıracaktır.

### 5.1. Mimarinin Genel Bakışı

Sunucu tarafı WebSocket mimarisi şu şekilde işler:

1.  **İstemci-Sunucu Bağlantısı:** Son kullanıcı istemcisi (bir web tarayıcısı, mobil uygulama veya başka bir servis), sizin backend sunucunuza bir WebSocket bağlantısı kurar.
2.  **Sunucu-OpenAI Bağlantısı:** Backend sunucunuz, istemciden bir bağlantı isteği aldığında, kendi OpenAI API anahtarınızı kullanarak OpenAI'nin WebSocket endpoint'ine (`wss://api.openai.com/v1/realtime`) yeni bir WebSocket bağlantısı başlatır.
3.  **Olayların Aktarılması (Relaying):**
    *   **İstemciden OpenAI'ye:** İstemcinin sizin sunucunuza gönderdiği her olay (örneğin, `conversation.item.create`), sunucunuz tarafından alınır ve doğrudan OpenAI'ye olan WebSocket bağlantısı üzerinden iletilir.
    *   **OpenAI'den İstemciye:** OpenAI'nin sizin sunucunuza gönderdiği her olay (örneğin, `response.audio.delta` veya `response.audio_transcript.done`), sunucunuz tarafından alınır ve ilgili istemcinin WebSocket bağlantısı üzerinden istemciye geri iletilir.
4.  **Oturum Yönetimi (Session Management):** Sunucunuz, her bir istemci bağlantısını ve ona karşılık gelen OpenAI bağlantısını ayrı ayrı yönetmekten sorumludur. Bu genellikle bir `ConnectionManager` sınıfı veya benzeri bir yapı ile gerçekleştirilir ve oturum bilgileri bir veritabanı veya Redis gibi bir in-memory store'da saklanabilir.

Bu mimari, OpenAI API anahtarınızın her zaman güvende, sunucu tarafında kalmasını sağlar ve size gelen/giden veriler üzerinde tam kontrol imkanı tanır.

### 5.2. Detaylı Kod Örneği (`fastapi_backend.py`)

Bu rehberin 3. Bölümünde kurulumunu yaptığımız FastAPI sunucusunu şimdi Realtime API için tam teşekküllü bir WebSocket relay sunucusu haline getireceğiz. Aşağıdaki kod, bağlantı yönetimini, olay aktarımını ve temel API endpoint'lerini içerir.

```python
# /server/main.py

import os
import json
import asyncio
import logging
from typing import Dict
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import websockets
import dotenv

# .env dosyasını yükle
dotenv.load_dotenv()

# Logging ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI uygulaması
app = FastAPI(title="OpenAI Realtime API Backend Relay")

# CORS ayarları (frontend'in erişebilmesi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bağlantı yöneticisi
class ConnectionManager:
    def __init__(self):
        # {client_id: client_websocket}
        self.client_connections: Dict[str, WebSocket] = {}
        # {client_id: openai_websocket}
        self.openai_connections: Dict[str, websockets.WebSocketClientProtocol] = {}

    async def connect_client(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.client_connections[client_id] = websocket
        logger.info(f"Client connected: {client_id}")

    async def disconnect_client(self, client_id: str):
        if client_id in self.client_connections:
            del self.client_connections[client_id]
        if client_id in self.openai_connections:
            # OpenAI bağlantısını da kapat
            await self.openai_connections[client_id].close()
            del self.openai_connections[client_id]
        logger.info(f"Client disconnected: {client_id}")

    async def connect_openai(self, client_id: str):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise Exception("OPENAI_API_KEY is not set.")

        model = "gpt-4o-realtime-preview-2024-12-17"
        url = f"wss://api.openai.com/v1/realtime?model={model}"
        headers = {"Authorization": f"Bearer {api_key}"}

        try:
            openai_ws = await websockets.connect(url, extra_headers=headers)
            self.openai_connections[client_id] = openai_ws
            logger.info(f"Connected to OpenAI for client: {client_id}")
            return openai_ws
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI for {client_id}: {e}")
            raise

    async def send_to_client(self, client_id: str, message: str):
        if client_id in self.client_connections:
            await self.client_connections[client_id].send_text(message)

    async def send_to_openai(self, client_id: str, message: str):
        if client_id in self.openai_connections:
            await self.openai_connections[client_id].send(message)

manager = ConnectionManager()


async def openai_receiver(client_id: str):
    """OpenAI'den gelen mesajları dinler ve istemciye aktarır."""
    openai_ws = manager.openai_connections.get(client_id)
    if not openai_ws:
        return

    try:
        async for message in openai_ws:
            await manager.send_to_client(client_id, message)
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"OpenAI connection closed for {client_id}")
    except Exception as e:
        logger.error(f"Error in OpenAI receiver for {client_id}: {e}")
    finally:
        await manager.disconnect_client(client_id)


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect_client(websocket, client_id)

    try:
        # OpenAI için yeni bir bağlantı ve dinleyici başlat
        await manager.connect_openai(client_id)
        asyncio.create_task(openai_receiver(client_id))

        # İstemciden gelen mesajları dinle ve OpenAI'ye aktar
        while True:
            data = await websocket.receive_text()
            await manager.send_to_openai(client_id, data)

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected from our server.")
    except Exception as e:
        logger.error(f"An error occurred in websocket endpoint for {client_id}: {e}")
    finally:
        await manager.disconnect_client(client_id)


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# Sunucuyu çalıştırmak için (terminalde):
# uvicorn main:app --reload
```

### 5.3. Sunucu Tarafı Kodunun Açıklaması

*   **`ConnectionManager` Sınıfı:** Bu sınıf, tüm aktif bağlantıları yönetir. İki adet sözlük (dictionary) tutar: `client_connections` (bizim sunucumuza bağlanan istemciler için) ve `openai_connections` (bizim sunucumuzdan OpenAI'ye açılan bağlantılar için). Bu, her istemcinin kendi izole OpenAI oturumuna sahip olmasını sağlar.
*   **`connect_openai` Metodu:** Bu metot, ortam değişkenlerinden (`.env` dosyasından) okuduğu `OPENAI_API_KEY` ile OpenAI'nin WebSocket endpoint'ine güvenli bir bağlantı kurar.
*   **`openai_receiver` Fonksiyonu:** Bu, her bir OpenAI bağlantısı için arka planda çalışan bir görevdir (`asyncio.create_task`). Sürekli olarak OpenAI'den gelen mesajları dinler ve `manager.send_to_client` aracılığıyla ilgili istemciye anında iletir.
*   **`/ws/{client_id}` Endpoint'i:** Bu, ana WebSocket endpoint'imizdir. Bir istemci bu adrese bağlandığında:
    1.  `manager.connect_client` ile istemci kaydedilir.
    2.  `manager.connect_openai` ile bu istemci için yeni bir OpenAI bağlantısı açılır.
    3.  `openai_receiver` görevi başlatılır.
    4.  Sonsuz bir döngü (`while True`) içinde istemciden gelen mesajlar (`websocket.receive_text()`) dinlenir ve doğrudan `manager.send_to_openai` ile OpenAI'ye aktarılır.
*   **Hata Yönetimi ve Temizlik:** `try...except...finally` blokları, bir istemcinin veya OpenAI bağlantısının kopması durumunda (`WebSocketDisconnect`, `ConnectionClosed`), ilgili tüm bağlantıların ve kaynakların `manager.disconnect_client` metodu ile temizlenmesini sağlar.

Bu sunucu tarafı mimari, hem güvenli hem de ölçeklenebilir bir temel sağlar. Gelen ve giden olayları loglama, ek iş mantığı uygulama veya birden fazla istemci türünü yönetme gibi daha gelişmiş özellikler eklemek için kolayca genişletilebilir.





































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																"## - [5]




## 6. Frontend Geliştirme (React ile)

Frontend, kullanıcıların doğrudan etkileşimde bulunduğu arayüzdür. Bu bölümde, daha önce oluşturduğumuz `WebRTCClient` ve `WebSocketClient` sınıflarını kullanarak, kullanıcı dostu bir arayüz oluşturmaya odaklanacağız. React kullanarak, bağlantı durumunu gösteren, konuşma geçmişini listeleyen ve hem metin hem de ses girişi sağlayan bir bileşen oluşturacağız.

### 6.1. Arayüz Bileşenleri (UI Components)

Etkili bir arayüz için aşağıdaki bileşenlere ihtiyacımız olacak:

*   **Bağlantı Kontrolleri:** Oturumu başlatmak ve durdurmak için düğmeler.
*   **Durum Göstergesi:** Bağlantının mevcut durumunu (bağlı, bağlanıyor, bağlantı kesildi, hata) gösteren bir alan.
*   **Mesajlaşma Alanı:** Kullanıcı ve asistan arasındaki konuşma geçmişini gösteren bir pencere.
*   **Metin Girişi:** Kullanıcının metin tabanlı mesajlar gönderebileceği bir metin alanı ve gönder düğmesi.
*   **Ses Girişi:** Kullanıcının mikrofonunu kullanarak konuşmasını sağlayan bir 




### 6.2. React Bileşeni (`App.jsx`)

Aşağıdaki React bileşeni, bu arayüz elemanlarını bir araya getirir ve `WebSocketClient`'ı kullanarak backend sunucusuyla iletişim kurar. Bu örnek, WebSocket tabanlı bir bağlantıyı göstermektedir, ancak aynı prensipler `WebRTCClient` ile de uygulanabilir.

```jsx
// /client/src/App.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // Stil dosyasını import ediyoruz

// WebSocket istemci sınıfı (önceki bölümde oluşturulduğu varsayılır)
// import { WebSocketClient } from './services/WebSocketClient';

// Bu örnekte WebSocketClient'ı doğrudan burada tanımlayalım
class WebSocketClient {
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    this.onConnect = null;
    this.onDisconnect = null;
    this.onMessage = null;
    this.onError = null;
  }

  connect() {
    // ... (önceki bölümdeki WebSocketClient kodu buraya gelecek)
  }

  send(message) {
    // ... (önceki bölümdeki WebSocketClient kodu buraya gelecek)
  }

  disconnect() {
    // ... (önceki bölümdeki WebSocketClient kodu buraya gelecek)
  }
}


function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const wsClient = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const BACKEND_URL = 'ws://localhost:8000'; // Backend WebSocket URL'si
  const SESSION_ID = `session_${Date.now()}`;

  // Sunucu mesajlarını işleme
  const handleServerMessage = useCallback((message) => {
    console.log('Received message:', message.type);
    const event = {
        id: Date.now() + Math.random(),
        direction: 'incoming',
        ...message
    };
    setMessages(prev => [...prev, event]);

    // Örnek: Asistanın metin yanıtını ayıklama
    if (message.type === 'response.audio_transcript.done') {
        const assistantMessage = {
            id: Date.now(),
            role: 'assistant',
            content: message.transcript,
            timestamp: new Date().toLocaleTimeString('tr-TR'),
        };
        setMessages(prev => [...prev, assistantMessage]);
    }
  }, []);

  // Bağlantı kurma ve olay dinleyicilerini ayarlama
  const connect = useCallback(async () => {
    if (wsClient.current && wsClient.current.isConnected) return;

    wsClient.current = new WebSocketClient(BACKEND_URL, SESSION_ID);
    setConnectionStatus('connecting');

    wsClient.current.onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      addMessage('system', 'Backend sunucusuna başarıyla bağlanıldı.');
    };

    wsClient.current.onDisconnect = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      addMessage('system', 'Bağlantı kesildi.');
    };

    wsClient.current.onMessage = handleServerMessage;
    wsClient.current.onError = (err) => {
      setError(`WebSocket Hatası: ${err.message}`);
      setConnectionStatus('error');
    };

    try {
      await wsClient.current.connect();
    } catch (err) {
      setError(`Bağlantı kurulamadı: ${err.message}`);
      setConnectionStatus('error');
    }
  }, [SESSION_ID, BACKEND_URL, handleServerMessage]);

  // Metin mesajı gönderme
  const sendTextMessage = () => {
    if (!inputText.trim() || !isConnected) return;

    const textEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: inputText.trim() }]
      }
    };
    wsClient.current.send(textEvent);
    addMessage('user', inputText.trim());

    // Yanıtı tetikle
    wsClient.current.send({ type: 'response.create' });
    setInputText('');
  };

  // Yardımcı fonksiyon: Mesaj listesine ekleme
  const addMessage = (role, content) => {
      const message = {
          id: Date.now(),
          role: role,
          content: content,
          timestamp: new Date().toLocaleTimeString('tr-TR'),
      };
      setMessages(prev => [...prev, message]);
  };

  // Arayüz (UI) render etme
  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Kontrol Paneli</h2>
        <div className="controls">
            <button onClick={connect} disabled={isConnected}>Bağlan</button>
            <button onClick={() => wsClient.current?.disconnect()} disabled={!isConnected}>Bağlantıyı Kes</button>
        </div>
        <div className="status-panel">
            <strong>Durum:</strong> <span className={`status-${connectionStatus}`}>{connectionStatus}</span>
        </div>
        {error && <div className="error-panel">{error}</div>}
      </div>
      <div className="main-content">
        <div className="message-window">
            {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.role}`}>
                    <div className="message-role">{msg.role}</div>
                    <div className="message-text">{msg.content || JSON.stringify(msg, null, 2)}</div>
                    <div className="message-timestamp">{msg.timestamp}</div>
                </div>
            ))}
        </div>
        <div className="input-area">
            <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Bir mesaj yazın..."
                disabled={!isConnected}
            />
            <button onClick={sendTextMessage} disabled={!isConnected || !inputText}>Gönder</button>
            <button className={`record-button ${isRecording ? 'recording' : ''}`} disabled={!isConnected}>
                {isRecording ? 'Kayıt Durdur' : 'Sesli Mesaj'}
            </button>
        </div>
      </div>
    </div>
  );
}

export default App;
```

### 6.3. Stil Dosyası (`App.css`)

Uygulamanın daha iyi görünmesi için aşağıdaki CSS kodunu `client/src/App.css` dosyasına ekleyebilirsiniz.

```css
/* /client/src/App.css */

.app-container {
  display: flex;
  height: 100vh;
  font-family: sans-serif;
}

.sidebar {
  width: 250px;
  background-color: #f4f4f8;
  padding: 20px;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.sidebar h2 {
  text-align: center;
  color: #333;
  margin-top: 0;
}

.controls button {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  font-size: 16px;
}

.controls button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.status-panel {
  margin-top: 20px;
  padding: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
}

.status-connected { color: #28a745; font-weight: bold; }
.status-disconnected { color: #dc3545; font-weight: bold; }
.status-connecting { color: #ffc107; font-weight: bold; }
.status-error { color: #dc3545; font-weight: bold; }

.error-panel {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 5px;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.message-window {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #ffffff;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  margin-bottom: 15px;
  line-height: 1.4;
}

.message-bubble.user {
  background-color: #007bff;
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 3px;
}

.message-bubble.assistant {
  background-color: #e9ecef;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 3px;
}

.message-bubble.system {
  background-color: #fff3cd;
  color: #856404;
  text-align: center;
  max-width: 100%;
  font-style: italic;
  font-size: 0.9em;
}

.message-role {
  font-weight: bold;
  font-size: 0.8em;
  margin-bottom: 5px;
  text-transform: capitalize;
}

.message-timestamp {
  font-size: 0.7em;
  text-align: right;
  margin-top: 5px;
  opacity: 0.7;
}

.input-area {
  display: flex;
  padding: 20px;
  border-top: 1px solid #ddd;
  background-color: #f4f4f8;
}

.input-area textarea {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: none;
  font-size: 16px;
}

.input-area button {
  padding: 10px 20px;
  margin-left: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #28a745;
  color: white;
}

.record-button.recording {
    background-color: #dc3545;
}
```

Bu React uygulaması, WebSocket üzerinden backend sunucusuyla iletişim kurarak Realtime API'nin temel işlevlerini kullanmak için sağlam bir başlangıç noktası sunar. Kullanıcılar metin mesajları gönderebilir, bağlantı durumunu izleyebilir ve hem giden hem de gelen olayları bir log penceresinde görebilirler. Ses girişi için `isRecording` durumu ve ilgili düğme eklenmiş olup, bu işlevsellik bir sonraki bölümde detaylandırılacak olan ses işleme mantığı ile tamamlanabilir.





























































































































































































































































































































































































































































































































































































































































































































































































































































































































































































																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																				"## - [5]




## 7. Function Calling (Fonksiyon Çağırma)

Function calling, yapay zeka asistanınızın yeteneklerini önemli ölçüde artıran, onu sadece bir konuşma ortağı olmaktan çıkarıp aktif bir eylem gerçekleştirici haline getiren en güçlü özelliklerden biridir. Realtime API, bu özelliği konuşma akışına sorunsuz bir şekilde entegre ederek, asistanın harici araçları ve API'leri çağırmasına, sonuçları almasına ve bu sonuçları kullanarak kullanıcıya daha zengin ve bağlama duyarlı yanıtlar vermesine olanak tanır.

Örneğin, bir kullanıcı "İstanbul'da hava nasıl?" diye sorduğunda, asistan bu soruyu doğrudan cevaplamak yerine, `get_weather` adında bir fonksiyonu `location: "İstanbul"` parametresiyle çağırabilir. Bu fonksiyon, bir hava durumu API'sinden gerçek zamanlı verileri alır ve sonucu asistana geri döndürür. Asistan da bu veriyi kullanarak, "İstanbul'da hava şu anda 25 derece ve parçalı bulutlu." gibi bir yanıt üretebilir.

### 7.1. Function Calling Akışı

Realtime API'de function calling süreci aşağıdaki olaylar dizisi ile yönetilir:

1.  **Araç Tanımlama (`session.update`):** Oturum (session) başladığında veya güncellendiğinde, istemci `session.update` olayı içinde `tools` dizisini kullanarak modele hangi fonksiyonların (araçların) mevcut olduğunu bildirir. Her araç tanımı, fonksiyonun adını, açıklamasını ve beklediği parametreleri (JSON Schema formatında) içerir.

2.  **Modelin Kararı:** Kullanıcı bir istekte bulunduğunda, model (örneğin, GPT-4o) bu isteğin tanımlanan araçlardan biriyle çözülüp çözülemeyeceğine karar verir.

3.  **Fonksiyon Çağrısı Olayları:** Model bir fonksiyonu çağırmaya karar verirse, istemciye bir dizi olay gönderir:
    *   `response.function_call_arguments.delta`: Model, çağrılacak fonksiyonun argümanlarını JSON formatında parça parça (streaming) göndermeye başlar. Bu, özellikle uzun veya karmaşık argümanlar için kullanışlıdır.
    *   `response.function_call_arguments.done`: Argümanların tamamı gönderildiğinde bu olay tetiklenir. Bu olay, fonksiyonun adını (`name`), çağrı kimliğini (`call_id`) ve argümanların tamamını (`arguments`) içerir. Bu, istemcinin fonksiyonu çalıştırması için bir işarettir.

4.  **İstemcinin Fonksiyonu Çalıştırması:** İstemci, `response.function_call_arguments.done` olayını aldığında, belirtilen fonksiyonu (örneğin, `get_weather`) gelen argümanlarla çalıştırır.

5.  **Sonucun Geri Bildirilmesi (`conversation.item.create`):** İstemci, fonksiyonun çalıştırılmasından elde edilen sonucu (veya bir hata oluştuysa hata mesajını) `conversation.item.create` olayı ile modele geri gönderir. Bu olayın `item` alanı, `type: 'function_call_output'`, `call_id` (orijinal çağrıya referans) ve `output` (fonksiyonun sonucu) alanlarını içermelidir.

6.  **Modelin Son Yanıtı:** Model, fonksiyonun sonucunu alır, bu bilgiyi işler ve kullanıcıya nihai, doğal dilde bir yanıt oluşturur. Bu yanıt, normal bir metin veya ses yanıtı olarak (`response.audio_transcript.done`, `response.audio.delta` vb.) istemciye gönderilir.

### 7.2. Sunucu Tarafı Function Calling Örneği (Python)

WebSocket tabanlı sunucu tarafı implementasyonumuzda function calling'i nasıl yöneteceğimize dair bir örnek aşağıda verilmiştir. Bu kod, `fastapi_backend.py` dosyamızdaki `handle_openai_messages` fonksiyonuna eklenebilir veya bu fonksiyon tarafından çağrılabilir.

```python
# /server/main.py (içine eklenecek veya buradan çağrılacak fonksiyonlar)

class FunctionHandler:
    """Mevcut fonksiyonları ve çalıştırılmalarını yönetir."""

    def __init__(self):
        self.functions = {
            "get_weather": self.get_weather,
            "get_current_time": self.get_current_time
        }

    def get_weather(self, location: str) -> str:
        """Belirtilen konum için sahte hava durumu bilgisi döndürür."""
        logger.info(f"Executing get_weather for location: {location}")
        if "istanbul" in location.lower():
            return json.dumps({"temperature": "25°C", "condition": "Güneşli"})
        elif "ankara" in location.lower():
            return json.dumps({"temperature": "22°C", "condition": "Parçalı Bulutlu"})
        else:
            return json.dumps({"temperature": "Bilinmiyor", "condition": "Veri yok"})

    def get_current_time(self) -> str:
        """Şu anki tarih ve saati döndürür."""
        logger.info("Executing get_current_time")
        return datetime.now().isoformat()

    def execute(self, name: str, args: dict) -> str:
        """Verilen isme göre fonksiyonu çalıştırır."""
        if name not in self.functions:
            return json.dumps({"error": f"Function '{name}' not found."})
        
        try:
            func = self.functions[name]
            # Fonksiyonu argümanlarla çağır
            result = func(**args)
            return result
        except Exception as e:
            logger.error(f"Error executing function {name}: {e}")
            return json.dumps({"error": str(e)})

# ... ConnectionManager sınıfı ve diğer kodlar ...

function_handler = FunctionHandler()

async def handle_openai_messages(client_id: str, openai_ws):
    """OpenAI'den gelen mesajları handling"""
    # ... (diğer event handling kodları) ...

    try:
        async for message in openai_ws:
            event = json.loads(message)
            await manager.send_to_client(client_id, message) # Olayı istemciye de gönder

            if event.get("type") == "response.function_call_arguments.done":
                call_id = event.get("call_id")
                function_name = event.get("name")
                try:
                    arguments = json.loads(event.get("arguments", "{}"))
                except json.JSONDecodeError:
                    arguments = {}

                # Fonksiyonu çalıştır
                result = function_handler.execute(function_name, arguments)

                # Sonucu OpenAI'ye geri gönder
                output_event = {
                    "type": "conversation.item.create",
                    "item": {
                        "type": "function_call_output",
                        "call_id": call_id,
                        "output": result
                    }
                }
                await manager.send_to_openai(client_id, json.dumps(output_event))

            # ... (diğer event handling kodları) ...

    # ... (hata yönetimi ve kapanış kodları) ...
```

Bu örnekte:

1.  `FunctionHandler` sınıfı, mevcut fonksiyonları (`get_weather`, `get_current_time`) ve bunları çağırmak için bir `execute` metodu içerir.
2.  `handle_openai_messages` fonksiyonu, `response.function_call_arguments.done` olayını dinler.
3.  Bu olay geldiğinde, fonksiyon adını ve argümanlarını ayıklar.
4.  `function_handler.execute` ile ilgili fonksiyonu çalıştırır.
5.  Elde edilen sonucu, `conversation.item.create` tipinde yeni bir olayla ve `function_call_output` item'ı ile OpenAI'ye geri gönderir.

### 7.3. Araçları (Tools) Tanımlama

Modelin hangi fonksiyonları çağırabileceğini bilmesi için, oturum başlangıcında bu fonksiyonları tanımlamanız gerekir. Bu, genellikle `session.update` olayı ile yapılır.

**İstemci Tarafından Gönderilen `session.update` Örneği:**

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "Sen hava durumu ve saat hakkında bilgi verebilen bir asistansın.",
    "voice": "alloy",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Belirli bir şehir için güncel hava durumunu getirir.",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "Hava durumunun öğrenileceği şehir, örneğin 'İstanbul, TR'"
              }
            },
            "required": ["location"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "get_current_time",
          "description": "Geçerli tarih ve saati döndürür.",
          "parameters": {
            "type": "object",
            "properties": {},
            "required": []
          }
        }
      }
    ]
  }
}
```

Bu yapılandırma, modele `get_weather` ve `get_current_time` adında iki aracının olduğunu, ne işe yaradıklarını ve hangi parametreleri beklediklerini bildirir. Model, kullanıcı girdisini analiz ederken bu bilgiyi kullanarak doğru aracı doğru parametrelerle çağırma kararı alabilir.

Function calling, Realtime API'nin yeteneklerini statik bir konuşma arayüzünün çok ötesine taşıyarak, onu dış dünya ile etkileşime geçebilen, görevleri otomatikleştirebilen ve kullanıcılara daha zengin, daha faydalı deneyimler sunabilen dinamik bir asistana dönüştürür.










































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																				"## - [5]




## 8. Ses İşleme (Audio Handling)

Gerçek zamanlı sesli etkileşimlerin temel taşı, ses verisinin verimli bir şekilde yakalanması, iletilmesi ve oynatılmasıdır. Realtime API, bu süreci hem WebRTC hem de WebSocket protokolleri üzerinden destekler, ancak her birinin kendine özgü implementasyon detayları vardır.

### 8.1. Ses Formatları ve Kalitesi

Realtime API, hem giriş hem de çıkış için çeşitli ses formatlarını destekler. Oturum başlangıcında `session.update` olayı ile bu formatları belirleyebilirsiniz:

```json
{
  "type": "session.update",
  "session": {
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "whisper-1",
      "language": "tr"
    }
  }
}
```

*   **`input_audio_format`**: İstemciden OpenAI'ye gönderilen sesin formatı. `pcm16` (16-bit PCM) ve `opus` gibi formatlar desteklenir. `pcm16` genellikle ham, sıkıştırılmamış ses verisidir ve 24kHz örnekleme hızında (sample rate) beklenir.
*   **`output_audio_format`**: OpenAI'den istemciye gönderilen asistan sesinin formatı. Yine `pcm16` ve `opus` gibi seçenekler mevcuttur. Ayrıca, `output_audio_format` için `aac` ve `mp3_22050_32k` gibi daha sıkıştırılmış formatlar da seçilebilir, bu da bant genişliği kullanımını azaltabilir.
*   **`input_audio_transcription`**: Gelen sesin metne dönüştürülmesi için kullanılacak modeli (`whisper-1` gibi) ve dili (`tr` gibi) belirtir.

### 8.2. İstemci Tarafında Ses Yakalama (Mikrofon Erişimi)

Tarayıcıda kullanıcının sesini yakalamak için `navigator.mediaDevices.getUserMedia` API'si kullanılır. Bu fonksiyon, kullanıcıdan mikrofon erişimi için izin ister ve bir `MediaStream` nesnesi döndürür.

```javascript
// Mikrofon erişimi isteme ve MediaStream alma
async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,      // Yankı engelleme
        noiseSuppression: true,     // Gürültü bastırma
        autoGainControl: true,      // Otomatik kazanç kontrolü
        sampleRate: 24000           // API'nin beklediği örnekleme hızı
      }
    });
    return stream;
  } catch (error) {
    console.error("Mikrofon erişimi reddedildi veya başarısız oldu:", error);
    throw new Error("Uygulamanın çalışması için mikrofon izni gereklidir.");
  }
}
```

Bu `stream` nesnesi, WebRTC implementasyonunda doğrudan `peerConnection.addTrack()` ile bağlantıya eklenir. WebSocket implementasyonunda ise, bu `stream`'i `MediaRecorder` API'si ile kullanarak ses verisini küçük parçalara ayırıp backend sunucusuna gönderebilirsiniz.

### 8.3. Gelen Sesi Oynatma

*   **WebRTC ile:** Bu protokolde ses oynatma oldukça basittir. `RTCPeerConnection`'ın `ontrack` olayı tetiklendiğinde, gelen `MediaStream`'i bir HTML `<audio>` elementinin `srcObject` özelliğine atamanız yeterlidir. Tarayıcı, gelen ses akışını otomatik olarak oynatacaktır.

    ```javascript
    // WebRTCClient sınıfı içinde
    setupRemoteMedia() {
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      document.body.appendChild(this.audioElement);

      this.peerConnection.ontrack = (event) => {
        if (event.track.kind === 'audio') {
          this.audioElement.srcObject = event.streams[0];
        }
      };
    }
    ```

*   **WebSocket ile:** WebSocket üzerinden ses, genellikle `response.audio.delta` olayları içinde base64 formatında kodlanmış ham PCM verisi olarak gelir. Bu veriyi oynatmak için daha fazla işlem gerekir:

    1.  **Base64 Decode:** Gelen base64 string'ini bir `ArrayBuffer`'a dönüştürün.
    2.  **Audio Queue:** Gelen ses parçalarını (buffer) bir kuyruğa (queue) ekleyin.
    3.  **Web Audio API:** `AudioContext` kullanarak bu buffer'ları sırayla çözün (`decodeAudioData`) ve oynatın (`createBufferSource`, `start`). Bu, sesin kesintisiz ve akıcı bir şekilde çalınmasını sağlar.

    ```javascript
    // React bileşeni içinde bir ses oynatma yöneticisi örneği
    const audioQueue = useRef([]);
    const isPlaying = useRef(false);
    const audioContext = useRef(new (window.AudioContext || window.webkitAudioContext)());

    const processAudioQueue = async () => {
      if (isPlaying.current || audioQueue.current.length === 0) {
        return;
      }
      isPlaying.current = true;

      const audioData = audioQueue.current.shift();
      const buffer = Buffer.from(audioData, 'base64'); // Node.js Buffer veya benzeri bir yapı

      try {
        const audioBuffer = await audioContext.current.decodeAudioData(buffer.buffer);
        const source = audioContext.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.current.destination);
        source.onended = () => {
          isPlaying.current = false;
          processAudioQueue(); // Bir sonraki parçayı oynat
        };
        source.start();
      } catch (e) {
        console.error("Error decoding audio data:", e);
        isPlaying.current = false;
        processAudioQueue();
      }
    };

    // handleServerMessage içinde
    if (message.type === 'response.audio.delta' && message.delta) {
      audioQueue.current.push(message.delta);
      processAudioQueue();
    }
    ```

### 8.4. Ses Aktivitesi Algılama (VAD - Voice Activity Detection)

Kullanıcının ne zaman konuşmaya başladığını ve ne zaman bitirdiğini anlamak, akıcı bir diyalog için çok önemlidir. Realtime API, bu işlevi `turn_detection` yapılandırması ile sunar.

```json
{
  "type": "session.update",
  "session": {
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5, // Hassasiyet (0-1 arası)
      "prefix_padding_ms": 300, // Konuşma başlangıcından önce ne kadar ses alınacağı
      "silence_duration_ms": 700 // Konuşmanın bittiğini varsaymak için gereken sessizlik süresi
    }
  }
}
```

*   **`type: 'server_vad'`**: Ses aktivitesi algılamanın OpenAI sunucuları tarafından yapılacağını belirtir. Bu, en basit ve genellikle en etkili yöntemdir.
*   **`silence_duration_ms`**: Kullanıcı bu süre kadar sessiz kaldığında, API konuşma sırasının (turn) bittiğini varsayar ve `response.create` olayı gönderilmiş gibi modele bir yanıt üretmesi için sinyal gönderir.

Bu özellik, kullanıcının her seferinde bir 




## 9. Güvenlik ve En İyi Uygulamalar (Best Practices)

OpenAI Realtime API gibi güçlü bir aracı kullanırken, uygulamanızın güvenliğini, verimliliğini ve sağlamlığını sağlamak kritik öneme sahiptir. Bu bölümde, geliştirme ve dağıtım süreçlerinizde dikkate almanız gereken temel güvenlik önlemleri ve en iyi uygulamalar ele alınmaktadır.

### 9.1. API Anahtarı Güvenliği

Bu, en önemli güvenlik kuralıdır. OpenAI API anahtarınız, hesabınıza tam erişim sağlayan gizli bir bilgidir ve bir parola gibi değerlendirilmelidir.

*   **Asla İstemci Tarafına Koymayın:** API anahtarınızı asla bir web tarayıcısında veya mobil uygulamada çalışan JavaScript, HTML veya herhangi bir istemci tarafı koda doğrudan gömmeyin. Tarayıcıda çalışan kod herkes tarafından görüntülenebilir ve bu, anahtarınızın çalınmasına yol açar.
*   **Ortam Değişkenleri Kullanın:** Anahtarınızı her zaman sunucu tarafında (backend) ortam değişkenleri (`.env` dosyaları veya sunucu yapılandırmanız aracılığıyla) kullanarak saklayın. Bu, kodunuzu versiyon kontrol sistemlerine (Git gibi) gönderdiğinizde anahtarınızın sızmasını önler. `.env` dosyalarınızı `.gitignore` dosyanıza eklediğinizden emin olun.
*   **Relay/Proxy Sunucusu Mimarisi:** Tarayıcı tabanlı uygulamalar için, bu rehberde gösterilen sunucu tarafı WebSocket veya WebRTC token sunucusu mimarisini kullanın. Bu mimaride, istemci sizin kendi sunucunuzla konuşur ve sadece sizin sunucunuz OpenAI API anahtarını kullanarak OpenAI ile iletişim kurar. Bu, anahtarınızı tamamen güvende tutar.

### 9.2. Geçici Kimlik Bilgileri (Ephemeral Keys)

WebRTC tabanlı uygulamalar için, OpenAI doğrudan istemci tarafı bağlantıyı kolaylaştırmak amacıyla geçici anahtarlar (ephemeral keys) oluşturma yeteneği sunar. Bu anahtarlar kısa ömürlüdür ve yalnızca belirli bir oturum için geçerlidir.

*   **Backend Üzerinden Oluşturma:** Bu geçici anahtarları her zaman güvenli bir backend sunucusu üzerinden oluşturun. İstemci, oturum başlatmak istediğinde backend'inize bir istekte bulunur, backend'iniz OpenAI'den geçici anahtarı alır ve istemciye iletir.
*   **Kısa Yaşam Süresi (TTL):** Geçici anahtarları mümkün olan en kısa yaşam süresiyle (Time-to-Live) oluşturun. Genellikle bir oturumun beklenen süresinden biraz daha uzun bir süre (örneğin, 10-15 dakika) yeterlidir. Bu, anahtarın ele geçirilmesi durumunda potansiyel hasarı sınırlar.

### 9.3. Hata Yönetimi ve Yeniden Bağlanma (Error Handling & Reconnection)

Gerçek dünya ağ koşulları tahmin edilemez olabilir. Bağlantı kopmaları, gecikmeler ve beklenmedik hatalar kaçınılmazdır. Sağlam bir uygulama, bu durumlarla başa çıkabilmelidir.

*   **Kapsamlı Hata Yakalama:** Kodunuzun tüm ağ isteği ve olay işleme bölümlerini `try...catch` blokları ile çevreleyin. Hem istemci hem de sunucu tarafında WebSocket veya WebRTC bağlantı hatalarını (`onerror` olayı) dinleyin ve bu hataları kullanıcıya anlaşılır bir şekilde bildirin veya loglayın.
*   **Otomatik Yeniden Bağlanma Mantığı:** Bir bağlantı koptuğunda (örneğin, `onclose` olayı tetiklendiğinde), otomatik olarak yeniden bağlanmayı deneyen bir mantık uygulayın. Üstel geri çekilme (exponential backoff) stratejisi kullanmak iyi bir pratiktir: ilk denemeden sonra 1 saniye, sonra 2, sonra 4, sonra 8 saniye bekleyerek sunucuyu aşırı yüklemekten kaçının. Belirli bir deneme sayısından (örneğin, 5 deneme) sonra başarısız olursa, kullanıcıya kalıcı bir hata mesajı gösterin.
*   **Durum Yönetimi:** Uygulamanızın arayüzünde bağlantının mevcut durumunu (örneğin, `Bağlanıyor...`, `Bağlı`, `Yeniden Bağlanıyor...`, `Bağlantı Kesildi`) her zaman net bir şekilde gösterin. Bu, kullanıcıya ne olduğu hakkında bilgi verir ve belirsizliği azaltır.

### 9.4. Verimlilik ve Maliyet Kontrolü

Realtime API, kullanım süresine göre ücretlendirilir, bu nedenle verimli kullanım maliyetleri düşürmenize yardımcı olur.

*   **Oturumları Düzgün Kapatma:** Kullanıcı uygulamadan ayrıldığında veya sekmeyi kapattığında, oturumun düzgün bir şekilde sonlandırıldığından emin olun. `window.onbeforeunload` gibi tarayıcı olaylarını kullanarak `client.stop()` veya `client.disconnect()` metodunu çağırın. Açık unutulan oturumlar gereksiz maliyetlere yol açabilir.
*   **Sessizlik Algılamayı (VAD) Ayarlama:** Sunucu tarafı VAD (`turn_detection`) ayarlarını uygulamanızın doğasına göre optimize edin. Çok kısa bir `silence_duration_ms` değeri, kullanıcının duraklamalarında modelin gereksiz yere yanıt vermesine neden olabilirken, çok uzun bir değer de konuşmayı yavaşlatabilir. İdeal dengeyi bulmak için testler yapın.
*   **Doğru Modeli Seçin:** `gpt-4o` ve `gpt-4o-mini` farklı maliyet ve performans profillerine sahiptir. Uygulamanızın gereksinimleri için yeterliyse, daha uygun maliyetli olan `gpt-4o-mini` modelini kullanmayı düşünün.

### 9.5. Kullanıcı Deneyimi (UX) İçin En İyi Uygulamalar

*   **Görsel Geri Bildirim:** Kullanıcıya her zaman ne olduğu hakkında görsel geri bildirim sağlayın. Örneğin:
    *   Asistan konuşurken bir animasyon veya ikon gösterin.
    *   Kullanıcı konuşurken bir ses dalgası görselleştirmesi (waveform) gösterin.
    *   Uygulama bir işlem yaparken (örneğin, bir fonksiyon çağrısı) bir yükleme göstergesi (spinner) gösterin.
*   **İlk Bağlantı:** Mikrofon izni ve ilk bağlantı süreci biraz zaman alabilir. Bu sırada kullanıcıya ne beklediğini açıklayan bir yükleme ekranı veya mesaj gösterin.
*   **Transkripsiyonu Gösterme:** Kullanıcının söylediklerinin canlı transkripsiyonunu ekranda göstermek, hem modelin kullanıcıyı doğru anladığını teyit etmesine yardımcı olur hem de etkileşimi daha şeffaf hale getirir.

Bu en iyi uygulamaları takip etmek, yalnızca daha güvenli ve sağlam uygulamalar oluşturmanıza yardımcı olmakla kalmaz, aynı zamanda son kullanıcı için daha profesyonel ve keyifli bir deneyim yaratır.





































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																"## - [5]




## 10. İleri Seviye Konular ve İpuçları

Temel bağlantı ve etkileşimi kurduktan sonra, Realtime API'nin potansiyelini daha da ileriye taşımak için keşfedebileceğiniz bazı ileri seviye konular ve optimizasyon teknikleri bulunmaktadır.

### 10.1. Çok Modlu Etkileşimler (Multimodality)

Realtime API'nin en heyecan verici yönlerinden biri, gelecekte ses ve metnin ötesine geçerek görüntü gibi diğer modaliteleri de destekleme potansiyelidir. GPT-4o modelinin doğal çok modlu yetenekleri sayesinde, gelecekteki API güncellemeleri ile aşağıdaki gibi senaryolar mümkün olabilir:

*   **Görsel Soru-Cevap:** Kullanıcının telefon kamerasından canlı bir video akışı gönderdiğini ve "Bu çiçeğin adı ne?" veya "Bu denklemi benim için çözebilir misin?" gibi sorular sorduğunu hayal edin.
*   **Etkileşimli Arayüz Kontrolü:** Kullanıcının "Şu düğmeye tıkla" veya "Bu metni vurgula" gibi komutlarla bir web arayüzünü sesli olarak kontrol etmesi.

Bu özellikler şu an için spekülatif olsa da, API'nin temel mimarisi (`session.update` içindeki `modalities` alanı) bu tür yeteneklerin gelecekte eklenebileceğine işaret etmektedir. Geliştiriciler, uygulamalarını bu olasılığı göz önünde bulundurarak tasarlayabilirler.

### 10.2. Ölçeklendirme ve Performans Optimizasyonu (Scaling & Performance)

Uygulamanız popüler hale geldikçe, artan sayıda eşzamanlı kullanıcıyı yönetmek için altyapınızı ölçeklendirmeniz gerekecektir.

*   **Yük Dengeleme (Load Balancing):** Sunucu tarafı (WebSocket relay) mimarisini kullanıyorsanız, birden fazla backend sunucusu örneği çalıştırıp önlerine bir yük dengeleyici koymanız gerekebilir. Bu durumda, yapışkan oturumlar (sticky sessions) kullanmak önemlidir, böylece bir istemcinin tüm WebSocket bağlantısı boyunca aynı sunucu örneğiyle iletişim kurması sağlanır.
*   **Verimli Ses Kodekleri:** Bant genişliği kullanımını azaltmak için `opus` gibi daha verimli ses kodeklerini kullanmayı düşünün. `pcm16` yüksek kalite sunsa da, sıkıştırılmamış olduğu için daha fazla bant genişliği tüketir. `output_audio_format` için `mp3` veya `aac` kullanmak da istemciye gönderilen veri miktarını önemli ölçüde azaltabilir.
*   **Redis ile Oturum Yönetimi:** Bu rehberdeki Python örneğinde gösterildiği gibi, oturum durumunu (session state), yapılandırmaları ve olay geçmişini yönetmek için Redis gibi hızlı bir in-memory veri deposu kullanmak, birden fazla sunucu örneği arasında durumu paylaşmayı kolaylaştırır ve performansı artırır.

### 10.3. Özel Araçlar ve Agentic Mimariler (Custom Tools & Agentic Architectures)

Function calling, agentic (etmen tabanlı) mimariler oluşturmanın temelidir. Asistanınıza daha karmaşık görevleri yerine getirme yeteneği kazandırabilirsiniz:

*   **Karmaşık İş Akışları:** Birden fazla aracı (tool) bir araya getiren iş akışları oluşturun. Örneğin, bir "seyahat planla" komutu, önce bir `find_flights` fonksiyonunu, ardından `book_hotel` ve son olarak `add_to_calendar` fonksiyonlarını zincirleme olarak çağırabilir.
*   **Veritabanı Entegrasyonu:** Asistanınıza, bir veritabanından kullanıcıya özel bilgileri (örneğin, geçmiş siparişleri, hesap bakiyesini) çekme ve bu bilgileri konuşmada kullanma yeteneği kazandırın.
*   **Harici API Entegrasyonları:** Asistanınızı, CRM, ERP veya diğer iş sistemlerinizle entegre ederek, kullanıcıların sesli komutlarla karmaşık iş süreçlerini tetiklemesini sağlayın (örneğin, "Yeni bir satış fırsatı oluştur" veya "Son müşteri destek biletinin durumunu kontrol et").

### 10.4. Gelişmiş Hata Ayıklama (Advanced Debugging)

Gerçek zamanlı sistemlerde hata ayıklamak zor olabilir. İşte bazı ipuçları:

*   **Kapsamlı Loglama:** Hem istemci hem de sunucu tarafında tüm olayları (gelen ve giden) zaman damgalarıyla birlikte detaylı bir şekilde loglayın. Bu, bir sorun oluştuğunda olayların sırasını ve içeriğini analiz etmenize olanak tanır.
*   **WebRTC Dahili Araçları:** Google Chrome, `chrome://webrtc-internals` adresinde WebRTC bağlantılarının durumu hakkında son derece ayrıntılı bilgi sağlayan güçlü bir hata ayıklama aracı sunar. Bu aracı kullanarak sinyalizasyon durumunu, ICE adaylarını ve veri akışını izleyebilirsiniz.
*   **Olay Görselleştirme:** Geliştirme aşamasında, React örneğimizde olduğu gibi, gelen ve giden olayları gerçek zamanlı olarak gösteren bir arayüz oluşturmak, sistemin nasıl davrandığını anlamak için paha biçilmezdir.

Bu ileri seviye konuları keşfederek, OpenAI Realtime API'yi kullanarak sadece basit soru-cevap botları değil, aynı zamanda karmaşık görevleri yerine getirebilen, dış dünya ile etkileşime girebilen ve son derece doğal bir kullanıcı deneyimi sunan sofistike yapay zeka asistanları oluşturabilirsiniz.









































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																				- [5]




## 11. Sorun Giderme ve Hata Ayıklama (Troubleshooting & Debugging)

Gerçek zamanlı sistemlerle çalışmak, doğası gereği karmaşık olabilir ve hata ayıklama süreci zorlayıcı gelebilir. Bağlantı sorunları, ses senkronizasyon problemleri veya beklenmedik olay sıralamaları gibi çeşitli sorunlarla karşılaşabilirsiniz. Bu bölümde, OpenAI Realtime API ile çalışırken karşılaşabileceğiniz yaygın sorunları ve bunları çözmek için kullanabileceğiniz etkili hata ayıklama stratejilerini ele alacağız.

### 11.1. Yaygın Hatalar ve Çözümleri

**Hata: `401 Unauthorized` (Yetkisiz Erişim)**

*   **Açıklama:** Bu hata, API isteğinizin kimliğinin doğrulanamadığı anlamına gelir. Genellikle geçersiz veya süresi dolmuş bir API anahtarı veya token nedeniyle oluşur.
*   **Çözüm Adımları:**
    1.  **API Anahtarını Kontrol Edin:** Sunucu tarafı kodunuzda kullandığınız `OPENAI_API_KEY` ortam değişkeninin doğru ayarlandığından ve geçerli bir OpenAI API anahtarı içerdiğinden emin olun.
    2.  **Geçici Anahtarları (Ephemeral Keys) Kontrol Edin:** WebRTC kullanıyorsanız, backend'inizden aldığınız geçici anahtarın süresinin dolmadığından ve doğru bir şekilde OpenAI'ye gönderildiğinden emin olun. Token oluşturma ve istemciye gönderme mantığınızı kontrol edin.
    3.  **Header'ları Doğrulayın:** `Authorization: Bearer YOUR_API_KEY` başlığının isteğinizde doğru formatta gönderildiğini kontrol edin.

**Hata: `WebSocket connection failed` veya `WebRTC connection failed`**

*   **Açıklama:** Bağlantı kurulamadığını gösterir. Bu, ağ sorunları, güvenlik duvarı kısıtlamaları veya yanlış endpoint URL'leri gibi çeşitli nedenlerden kaynaklanabilir.
*   **Çözüm Adımları:**
    1.  **URL'yi Kontrol Edin:** Doğru WebSocket (`wss://`) veya HTTP (`https://`) endpoint'ini kullandığınızdan emin olun. Model adının (`?model=...`) URL'ye doğru bir şekilde eklendiğini doğrulayın.
    2.  **Ağ ve Güvenlik Duvarı:** Özellikle WebRTC kullanıyorsanız, ağınızın veya güvenlik duvarınızın UDP trafiğini engellemediğinden emin olun. Gerekirse, bir TURN sunucusu yapılandırmayı düşünün. Kurumsal bir ağdaysanız, ağ yöneticinizle görüşmeniz gerekebilir.
    3.  **CORS Hataları (WebRTC/Frontend):** Tarayıcı konsolunda CORS (Cross-Origin Resource Sharing) ile ilgili hatalar görüyorsanız, backend sunucunuzun (token sunucusu) frontend uygulamanızın geldiği origine (örneğin, `http://localhost:5173`) izin verecek şekilde doğru yapılandırıldığından emin olun.

**Sorun: Ses Gelmiyor veya Kesik Kesik Geliyor**

*   **Açıklama:** Bağlantı kurulmuş gibi görünse de asistandan ses alamıyorsunuz veya ses kesintili geliyor.
*   **Çözüm Adımları:**
    1.  **`ontrack` Olayını Kontrol Edin (WebRTC):** `RTCPeerConnection` üzerindeki `ontrack` olay dinleyicisinin doğru bir şekilde ayarlandığından ve gelen `MediaStream`'in bir `<audio>` elementinin `srcObject` özelliğine atandığından emin olun. Tarayıcının otomatik oynatma (autoplay) politikalarının sesi engellemediğini kontrol edin (genellikle kullanıcı etkileşimi sonrası oynatmaya izin verilir).
    2.  **`response.audio.delta` Olayını Kontrol Edin (WebSocket):** Sunucu tarafı uygulamanızın bu olayları alıp almadığını loglayın. Alıyorsanız, istemci tarafında bu base64 verisini doğru bir şekilde `ArrayBuffer`'a dönüştürüp Web Audio API ile oynattığınızdan emin olun. Ses kuyruğu (audio queue) mantığınızdaki olası hataları kontrol edin.
    3.  **Ses Formatları:** `session.update` olayında belirttiğiniz `output_audio_format`'ın istemci tarafında beklediğiniz ve işleyebileceğiniz formatla eşleştiğinden emin olun.

**Sorun: Transkripsiyon Çalışmıyor veya Yanlış**

*   **Açıklama:** Kullanıcının konuşması metne dönüştürülmüyor veya hatalı dönüştürülüyor.
*   **Çözüm Adımları:**
    1.  **Mikrofon Erişimi:** Tarayıcının mikrofon erişim iznine sahip olduğundan emin olun. `getUserMedia` çağrısının başarılı olup olmadığını kontrol edin.
    2.  **Ses Girişi (WebRTC):** Mikrofon `MediaStream`'inin `addTrack` ile `RTCPeerConnection`'a eklendiğinden emin olun.
    3.  **Ses Girişi (WebSocket):** Ses verisini (`input_audio_buffer.append` ve `commit`) backend sunucunuza ve oradan da OpenAI'ye doğru bir şekilde gönderdiğinizden emin olun. Gönderdiğiniz sesin formatının (`input_audio_format`) ve örnekleme hızının (`sampleRate`) oturum yapılandırmasıyla eşleştiğini doğrulayın.
    4.  **Dil Ayarı:** `input_audio_transcription` içinde doğru dil kodunu (`language: "tr"`) belirttiğinizden emin olun.

### 11.2. Etkili Hata Ayıklama Araçları ve Teknikleri

*   **Tarayıcı Geliştirici Araçları (Browser DevTools):**
    *   **Konsol (Console):** Tüm `console.log`, `console.warn` ve `console.error` mesajlarınızı burada görebilirsiniz. Gelen ve giden olayları, bağlantı durumu değişikliklerini ve hata mesajlarını loglamak, akışı takip etmenin en basit yoludur.
    *   **Ağ (Network) Sekmesi:** WebSocket bağlantısının kurulup kurulmadığını ve hangi mesajların (frames) gidip geldiğini görmek için "WS" filtresini kullanın. WebRTC için, token almak amacıyla backend'inize yapılan HTTP isteklerini inceleyebilirsiniz.

*   **`chrome://webrtc-internals`:**
    Bu, WebRTC tabanlı uygulamalar için vazgeçilmez bir araçtır. Chrome tarayıcınızda bu adresi açtığınızda, aktif tüm WebRTC bağlantılarının detaylı bir dökümünü görürsünüz. Burada, sinyalizasyon durumu (SDP offer/answer), ICE adaylarının toplanması ve bağlantı durumu gibi kritik bilgileri gerçek zamanlı olarak izleyebilirsiniz. Bağlantı kurulamadığında sorunun nerede olduğunu (örneğin, ICE bağlantısı başarısız) anlamak için ilk bakılacak yer burasıdır.

*   **Sunucu Tarafı Loglama:**
    Backend sunucunuzda (örneğin, FastAPI uygulamanızda) kapsamlı loglama yapın. Hangi istemcinin ne zaman bağlandığını, OpenAI'ye hangi olayları gönderdiğinizi ve OpenAI'den hangi olayları aldığınızı zaman damgalarıyla birlikte loglayın. Bu, özellikle birden fazla eşzamanlı kullanıcıyla ilgili sorunları ayıklarken hayat kurtarıcıdır.

*   **Olayları Görselleştirme:**
    React örneğimizde olduğu gibi, gelen ve giden tüm olayları ham JSON formatında gösteren bir arayüz bileşeni oluşturun. Bu, olayların doğru sırada ve doğru içerikle gelip gelmediğini anında görmenizi sağlar. Hangi olayın beklendiği gibi tetiklenmediğini veya hangi verinin eksik olduğunu hızlıca tespit edebilirsiniz.

*   **Adım Adım Test Etme:**
    Karmaşık bir sorunla karşılaştığınızda, süreci en basit parçalarına ayırın:
    1.  Backend sunucunuz OpenAI'ye tek başına bağlanabiliyor mu? (Basit bir Python scripti ile test edin).
    2.  Frontend'iniz backend sunucunuza WebSocket bağlantısı kurabiliyor mu?
    3.  Basit bir "ping-pong" mesajı istemci-sunucu arasında gidip geliyor mu?
    4.  Tek bir metin mesajı istemciden OpenAI'ye ve yanıtı geri istemciye aktarılabiliyor mu?

    Sorunlu adımı izole ederek, problemin kaynağını çok daha hızlı bir şekilde bulabilirsiniz.

































































































































































































































































































































































































































































































































































































































































































































































































































































































- [5]




## 12. Gerçek Dünya Uygulama Örnekleri

OpenAI Realtime API'nin sunduğu düşük gecikmeli, akıcı sesli etkileşim yetenekleri, çok çeşitli yenilikçi uygulamaların kapısını aralamaktadır. Teorik bilgileri ve kod örneklerini pekiştirmek amacıyla, bu teknolojinin pratikte nasıl kullanılabileceğine dair bazı somut senaryoları ve mimari yaklaşımları inceleyelim.

### 12.1. Akıllı Müşteri Hizmetleri Asistanı (Telefon Entegrasyonu)

**Senaryo:** Bir e-ticaret şirketinin müşteri hizmetleri hattını arayan kullanıcılar, sipariş durumunu sormak, bir ürünü iade etmek veya kargo takibi yapmak gibi işlemler için yapay zeka destekli bir asistanla konuşur. Asistan, kullanıcının sözünü kesmesine izin verir, doğal bir dille yanıt verir ve gerekirse şirket veritabanından bilgi alarak işlemi tamamlar.

**Mimari Yaklaşım:**

1.  **Telefon Ağ Geçidi (Telephony Gateway):** Bu sistemin merkezinde, geleneksel telefon çağrılarını (PSTN) alıp ses verisini internet üzerinden akıtabilen bir hizmet bulunur. **Twilio Media Streams**, **Vonage Voice API** veya benzeri CPaaS (Communications Platform as a Service) sağlayıcıları bu iş için mükemmeldir.
2.  **Backend Sunucusu (WebSocket Relay):** Bu rehberdeki FastAPI örneğine benzer bir sunucu, telefon ağ geçidinden gelen ses akışını alır. Her gelen çağrı için yeni bir WebSocket bağlantısı açar.
3.  **Realtime API Bağlantısı:** Backend sunucusu, her çağrı için OpenAI Realtime API'ye ayrı bir WebSocket bağlantısı kurar. Telefon ağ geçidinden gelen ses verisini (`input_audio_buffer.append`) OpenAI'ye aktarır.
4.  **Function Calling ile Veritabanı Entegrasyonu:** Kullanıcı "Siparişimin durumu nedir?" diye sorduğunda, model bunu bir `get_order_status` fonksiyon çağrısına dönüştürür. Backend sunucusu bu olayı yakalar, kullanıcının telefon numarasından kimliğini doğrular, şirket veritabanından sipariş durumunu sorgular ve sonucu `function_call_output` olarak OpenAI'ye geri gönderir.
5.  **Sesli Yanıt:** Model, veritabanından gelen bilgiyle ("Siparişiniz kargoya verildi.") bir yanıt oluşturur. Bu yanıt, `response.audio.delta` olayları olarak backend sunucusuna ses verisi şeklinde akar.
6.  **Sesi Geri Aktarma:** Backend sunucusu, OpenAI'den gelen bu ses verisini alır ve telefon ağ geçidine geri aktarır. Ağ geçidi de bu sesi arayan kullanıcıya iletir. Tüm bu süreç, milisaniyeler içinde gerçekleşerek kesintisiz bir görüşme deneyimi sunar.

**Akış Şeması:**
`Kullanıcı (Telefon) <--> Telefon Ağ Geçidi (Twilio) <--> Backend Sunucusu (FastAPI) <--> OpenAI Realtime API`

### 12.2. Web Sitesi için Proaktif Satış ve Destek Asistanı

**Senaryo:** Bir SaaS (Software as a Service) şirketinin web sitesini ziyaret eden bir kullanıcı, fiyatlandırma sayfasında belirli bir süre geçirdiğinde veya yardım ikonuna tıkladığında, proaktif bir sesli asistan devreye girer. Asistan, "Fiyatlandırma seçeneklerimizle ilgili aklınıza takılan bir soru var mı? Size nasıl yardımcı olabilirim?" gibi bir karşılama ile kullanıcıyla etkileşime geçer.

**Mimari Yaklaşım:**

1.  **Frontend (React/Vue/etc.):** Bu rehberdeki React örneğine benzer bir frontend uygulaması, web sitesine entegre edilir. Kullanıcı etkileşimlerini (sayfada geçirilen süre, butona tıklama) izler.
2.  **WebRTC Bağlantısı:** Asistan tetiklendiğinde, frontend uygulaması doğrudan WebRTC üzerinden OpenAI Realtime API ile bir bağlantı kurar. Güvenlik için, bağlantı kurmadan önce backend sunucusundan geçici bir `ephemeral_key` alır.
3.  **Proaktif Başlatma:** Asistan, `response.create` olayını kendisi tetikleyerek önceden tanımlanmış bir karşılama mesajı ile konuşmayı başlatır. Bu, kullanıcının bir şey söylemesini beklemeden asistanın ilk adımı atmasını sağlar.
4.  **Dinamik Bilgi Sağlama:** Kullanıcı, "Enterprise planının özellikleri nelerdir?" diye sorduğunda, asistan `get_plan_details` adlı bir fonksiyonu çağırabilir. Bu fonksiyon, ya frontend tarafında statik olarak tanımlanmış bir JSON verisinden ya da backend API üzerinden güncel plan bilgilerini çeker.
5.  **Görsel ve Sesli Etkileşim:** Asistan konuşurken, ilgili planın özelliklerini web sayfasında vurgulayabilir veya bir karşılaştırma tablosu gösterebilir. Bu, sesli ve görsel deneyimi birleştirerek daha zengin bir etkileşim sunar.

### 12.3. Gerçek Zamanlı Toplantı Transkripsiyonu ve Özetleme

**Senaryo:** Bir video konferans uygulamasına entegre edilen bir bot, toplantıdaki tüm konuşmaları dinler, konuşmacıları ayırt ederek canlı transkripsiyon sağlar ve toplantı sonunda tüm konuşmaların bir özetini ve aksiyon maddelerini oluşturur.

**Mimari Yaklaşım:**

1.  **Toplantı Platformu Entegrasyonu:** Uygulama, Zoom, Google Meet veya Microsoft Teams gibi platformların API'lerini kullanarak toplantılara bir "bot" katılımcı olarak katılır. Bu bot, toplantının ses akışını (audio stream) alır.
2.  **Sunucu Tarafı İşleme:** Botun çalıştığı sunucu, her toplantı için bir Realtime API WebSocket bağlantısı açar. Toplantıdan gelen birleşik ses akışını API'ye gönderir.
3.  **Konuşmacı Ayrımı (Diarization):** API, `response.audio_transcript.delta` ve `done` olayları ile transkripsiyonu döndürür. Gelişmiş senaryolarda, her konuşmacı için ayrı ses akışları yönetilerek veya ses imzaları kullanılarak konuşmacı ayrımı yapılabilir (bu, ek bir diarization modeli gerektirebilir).
4.  **Canlı Transkripsiyon Gösterimi:** Sunucu, gelen transkripsiyon olaylarını toplantıdaki diğer katılımcıların arayüzüne bir WebSocket üzerinden göndererek canlı altyazıların gösterilmesini sağlar.
5.  **Özetleme ve Aksiyon Maddeleri:** Toplantı bittiğinde, sunucu o oturumda biriken tüm transkripsiyon metnini alır. Bu metni, OpenAI'nin standart `Chat Completions API`'sine bir özetleme ve aksiyon maddesi çıkarma prompt'u ile gönderir.
6.  **Raporlama:** Oluşturulan özet ve aksiyon maddeleri, toplantı katılımcılarına e-posta ile gönderilir veya proje yönetim aracına (Jira, Asana vb.) otomatik olarak eklenir.

Bu örnekler, Realtime API'nin sadece bir sohbet aracı olmadığını, aynı zamanda karmaşık iş akışlarını otomatikleştirmek, kullanıcı deneyimlerini dönüştürmek ve verimliliği artırmak için ne kadar güçlü bir platform olduğunu göstermektedir.




























































































































































































































































































































































































































































































































































































































































































































































































































































- [5]




## 13. Sıkça Sorulan Sorular (SSS)

**S: Realtime API ile standart Chat Completions API arasındaki temel fark nedir?**

**C:** Temel fark **gecikme (latency)** ve **etkileşim modelidir**. Chat Completions API, bir istek gönderip tam bir yanıt bekleme (request-response) modeline dayanır. Realtime API ise, ses ve olayların sürekli olarak akıtıldığı (streaming) bir model kullanır. Bu, Realtime API'nin konuşma tabanlı uygulamalar için çok daha düşük gecikme ve daha doğal bir etkileşim sağlamasına olanak tanır. Chat Completions, metin tabanlı, senkron olmayan görevler için daha uygunken, Realtime API anlık, sesli diyaloglar için tasarlanmıştır.

**S: Hangi modeli kullanmalıyım: `gpt-4o` mu, `gpt-4o-mini` mi?**

**C:** Bu, uygulamanızın gereksinimlerine ve bütçenize bağlıdır. `gpt-4o`, en yüksek performansı, en iyi anlama ve akıl yürütme yeteneklerini sunar. Karmaşık görevler, hassas diyaloglar veya üst düzey bir kullanıcı deneyimi gerektiren uygulamalar için en iyi seçimdir. `gpt-4o-mini` ise daha hızlı ve daha uygun maliyetlidir, ancak yetenekleri `gpt-4o`'ya göre biraz daha sınırlıdır. Daha basit görevler, maliyetin önemli bir faktör olduğu uygulamalar veya hızın kaliteden daha kritik olduğu durumlar için mükemmel bir alternatiftir.

**S: API anahtarımı tarayıcıda kullanabilir miyim?**

**C: Hayır, kesinlikle kullanmamalısınız.** OpenAI API anahtarınızı istemci tarafı (tarayıcı) kodunda ifşa etmek, hesabınızın kötüye kullanılmasına yol açabilecek ciddi bir güvenlik riskidir. Tarayıcı tabanlı uygulamalar için her zaman bu rehberde açıklanan iki mimariden birini kullanın: 1) WebRTC için, backend sunucunuzdan geçici bir anahtar (ephemeral key) alın. 2) WebSocket için, backend sunucunuzu bir aracı (relay) olarak kullanarak istemcinin doğrudan OpenAI ile değil, sizin sunucunuzla konuşmasını sağlayın.

**S: Kendi sesimi (voice) kullanabilir miyim?**

**C:** Şu anki itibarıyla Realtime API, `alloy`, `echo`, `fable`, `onyx`, `nova`, ve `shimmer` gibi önceden tanımlanmış bir dizi yüksek kaliteli ses sunmaktadır. Gelecekte özel ses klonlama (custom voice cloning) özelliklerinin eklenmesi muhtemeldir, ancak mevcut sürümde bu desteklenmemektedir.

**S: Hangi diller destekleniyor?**

**C:** API, `input_audio_transcription` nesnesindeki `language` parametresi aracılığıyla çok sayıda dili desteklemektedir. Türkçe için `"tr"` kodunu kullanabilirsiniz. Desteklenen dillerin tam listesi için OpenAI'nin resmi dokümantasyonuna başvurmanız en doğrusudur.

**S: Function calling senkron mu çalışır?**

**C:** Hayır, tamamen asenkron çalışır. Model bir fonksiyonu çağırmaya karar verdiğinde, konuşma durmaz. Model, `response.function_call_arguments.done` olayını gönderir ve istemcinin fonksiyonu çalıştırıp sonucu `function_call_output` olayı ile geri göndermesini bekler. Bu süreçte diğer olaylar (örneğin, ara metin yanıtları) akmaya devam edebilir. Bu asenkron yapı, arayüzün kilitlenmesini önler ve akıcı bir deneyim sağlar.

## 14. Sonuç ve Kaynaklar

OpenAI Realtime API, ses tabanlı yapay zeka uygulamaları geliştirmek için güçlü ve dönüştürücü bir araçtır. Düşük gecikmeli yapısı, çok modlu yetenekleri ve esnek olay güdümlü mimarisi sayesinde, geliştiricilerin daha önce mümkün olmayan derecede doğal ve etkileşimli deneyimler yaratmasına olanak tanır. Bu rehber, API'nin temel kavramlarından başlayarak, WebRTC ve WebSocket implementasyonları, function calling, güvenlik önlemleri ve pratik uygulama senaryolarına kadar geniş bir yelpazede bilgi sunmuştur.

Başarılı bir implementasyonun anahtarı, doğru mimariyi (istemci için WebRTC, sunucu için WebSocket) seçmek, API anahtarlarını güvende tutmak ve sağlam bir hata yönetimi ve kullanıcı deneyimi stratejisi oluşturmaktır. Sunulan kod örnekleri ve en iyi uygulamalar, kendi projeleriniz için sağlam bir temel oluşturacaktır.

**Referanslar ve Faydalı Bağlantılar:**

1.  [OpenAI Realtime API Tanıtımı (Resmi Blog)](https://openai.com/index/introducing-the-realtime-api/)
2.  [OpenAI Realtime API Dokümantasyonu](https://platform.openai.com/docs/guides/realtime)
3.  [OpenAI Realtime Console - GitHub Örneği (WebRTC)](https://github.com/openai/openai-realtime-console)
4.  [MDN Web Docs: WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
5.  [MDN Web Docs: WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)


