import { create } from 'zustand';

export const LANGUAGES = [
  { code: 'auto', name: 'Otomatik Algıla' },
  { code: 'tr', name: 'Türkçe 🇹🇷' },
  { code: 'en', name: 'English 🇬🇧' },
  { code: 'de', name: 'Deutsch 🇩🇪' },
  { code: 'fr', name: 'Français 🇫🇷' },
  { code: 'es', name: 'Español 🇪🇸' },
  { code: 'it', name: 'Italiano 🇮🇹' },
  { code: 'ru', name: 'Русский 🇷🇺' },
  { code: 'ar', name: 'العربية 🇸🇦' },
  { code: 'ja', name: '日本語 🇯🇵' },
  { code: 'ko', name: '한국어 🇰🇷' },
  { code: 'th', name: 'Tayca 🇹🇭' },
  { code: 'tk', name: 'Türkmence 🇹🇲' }
];

// Language names carry flag emoji, which Windows renders as bare letters ("TR").
export const plainLanguageName = (name: string) => name.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim();

export const getBrowserLanguage = () => {
  const lang = navigator.language.split('-')[0];
  return LANGUAGES.find(l => l.code === lang) ? lang : 'en';
};

const DEFAULT_QUICK_MESSAGES: Record<string, string[]> = {
  tr: ['Tamam', 'Seni seviyorum', 'Görüşürüz', 'Nasılsın?'],
  en: ['OK', 'I love you', 'See you', 'How are you?'],
  de: ['Okay', 'Ich liebe dich', 'Bis später', 'Wie geht es dir?'],
  fr: ["D'accord", "Je t'aime", 'À plus tard', 'Comment ça va ?'],
  es: ['Vale', 'Te quiero', 'Nos vemos', '¿Cómo estás?'],
  it: ['Va bene', 'Ti amo', 'Ci vediamo', 'Come stai?'],
  ru: ['Хорошо', 'Я тебя люблю', 'Увидимся', 'Как дела?'],
  ar: ['حسنًا', 'أحبك', 'أراك لاحقًا', 'كيف حالك؟'],
  ja: ['わかった', '愛してる', 'またね', '元気？'],
  ko: ['알겠어', '사랑해', '또 봐', '잘 지내?'],
  th: ['โอเค', 'ฉันรักคุณ', 'แล้วเจอกัน', 'สบายดีไหม?'],
  tk: ['Bolýar', 'Men seni söýýärin', 'Görüşýänçäk', 'Ýagdaýlaryň nähili?'],
};

export const getDefaultQuickMessages = (lang: string) => DEFAULT_QUICK_MESSAGES[lang] || DEFAULT_QUICK_MESSAGES.en;

const translations: Record<string, Record<string, string>> = {
  tr: {
    // UI strings
    'home.title': 'LiveTranslate',
    'home.subtitle': 'Farklı diller, tek bir sohbet.',
    'home.start': 'Başla',
    'home.create_room': 'Oda Kur',
    'home.create_desc': 'Yeni bir sohbet başlat ve davet et',
    'home.join_room': 'Odaya Gir',
    'home.join_desc': 'Davet kodunu kullanarak sohbete katıl',
    'home.name_placeholder': 'Adını yaz',
    'home.name_hint': 'Başlamak için adını yaz.',
    'home.recent': 'Son sohbetler',
    'home.change_photo': 'Fotoğrafı değiştir',
    
    'profile.title': 'Profilini Oluştur',
    'profile.subtitle': 'Seni nasıl çağıralım?',
    'profile.name_label': 'Adın',
    'profile.gender_label': 'Cinsiyet (İsteğe bağlı)',
    'profile.male': 'Erkek',
    'profile.female': 'Kadın',
    'profile.language_label': 'Konuştuğun Dil',
    'profile.save': 'Devam Et',

    'create.title': 'Odan hazır',
    'create.subtitle': 'Arkadaşını davet et ve sohbete başla.',
    'create.room_code': 'ODA KODU',
    'create.copy_code': 'Kodu Kopyala',
    'create.copy_link': 'Linki Kopyala',
    'create.copied': 'Kopyalandı!',
    'create.whatsapp': 'WhatsApp',
    'create.share': 'Paylaş...',
    'create.go_room': 'Odaya Giriş Yap',

    'join.title': 'Odaya Katıl',
    'join.subtitle': 'Arkadaşının gönderdiği kodu aşağıya gir.',
    'join.code_label': 'Oda Kodu',
    'join.code_placeholder': 'Örn: a1b2c',
    'join.button': 'Katıl',
    'join.joining': 'Katılınıyor...',

    'room.waiting': 'Arkadaşınızın odaya katılması bekleniyor...',
    'room.waiting_title': 'Arkadaşın henüz gelmedi',
    'room.waiting_desc': 'Bu kodu ona gönder. Katıldığında her mesaj ikinizin diline çevrilir.',
    'room.unnamed': 'İsimsiz sohbet',
    'room.not_found': 'Bu kodla bir oda yok',
    'room.not_found_hint': 'Kodu kontrol et ya da arkadaşından yeni bir davet iste.',
    'room.load_error': 'Oda açılamadı',
    'room.back_home': 'Ana sayfaya dön',
    'room.your_code': 'Oda Kodunuz:',
    'room.type_message': 'Bir mesaj yazın...',
    'room.settings': 'Ayarlar',
    'room.my_language': 'Benim Dilim',
    'room.partner_language': 'Partnerimin Dili',
    'room.auto_detect': 'Otomatik Algıla',
    'room.auto_desc': 'Eğer \'Otomatik Algıla\' seçerseniz, partnerinizin kendi ayarladığı dil kullanılır (şu an: {lang}).',
    'room.waiting_partner': 'Bekleniyor...',
    'room.appearance': 'Görünüm',
    'room.show_original': 'Orijinal Mesajları Göster',
    'room.leave': 'Odayı Terk Et',
    'room.copy': 'Kodu Kopyala',
    'room.share': 'Linki Paylaş',
    'room.share_whatsapp': 'WhatsApp ile Gönder',
    'room.share_whatsapp_sub': 'WhatsApp ile davet et',
    'room.share_link': 'Oda Linkini Gönder',
    'room.share_link_sub': 'Bağlantıyı kopyala veya paylaş',
    'room.link_copied': 'Oda linki kopyalandı!',
    'room.online': 'Çevrimiçi',
    'room.no_connection': 'Bağlantı Yok',
    'room.connecting': 'Bağlantı kuruluyor...',
    
    'msg.translated': 'Çevrildi',
    'msg.error': 'Çevrilemedi',
    'msg.translating': 'Çevriliyor...',
    'msg.retry': 'Tekrar Çevir',
    'msg.copy': 'Kopyala',
    'msg.copied': 'Kopyalandı',
    'msg.delivered': 'İletildi',
    'msg.seen': 'Görüldü',
    'common.save': 'Kaydet',
    'common.saved': 'Kaydedildi',
    'quick.title': 'Hazır Mesajlar',
    'quick.empty': 'Henüz hazır mesaj yok. Sık yazdıklarını aşağıya ekle.',
    'quick.new': 'Yeni hazır mesaj',
    'quick.edit_placeholder': 'Mesajı düzenle...',
    'common.edit': 'Düzenle',
    'common.delete': 'Sil',
    'common.cancel': 'İptal',
    'common.add': 'Ekle',
    'common.close': 'Kapat'
  },
  en: {
    'home.title': 'LiveTranslate',
    'home.subtitle': 'Different languages, one chat.',
    'home.start': 'Start',
    'home.create_room': 'Create Room',
    'home.create_desc': 'Start a new chat and invite',
    'home.join_room': 'Join Room',
    'home.join_desc': 'Join a chat using invite code',
    'home.name_placeholder': 'Your name',
    'home.name_hint': 'Type your name to get started.',
    'home.recent': 'Recent chats',
    'home.change_photo': 'Change photo',
    
    'profile.title': 'Create Profile',
    'profile.subtitle': 'How should we call you?',
    'profile.name_label': 'Your Name',
    'profile.gender_label': 'Gender (Optional)',
    'profile.male': 'Male',
    'profile.female': 'Female',
    'profile.language_label': 'Your Language',
    'profile.save': 'Continue',

    'create.title': 'Room is ready',
    'create.subtitle': 'Invite a friend and start chatting.',
    'create.room_code': 'ROOM CODE',
    'create.copy_code': 'Copy Code',
    'create.copy_link': 'Copy Link',
    'create.copied': 'Copied!',
    'create.whatsapp': 'WhatsApp',
    'create.share': 'Share...',
    'create.go_room': 'Enter Room',

    'join.title': 'Join Room',
    'join.subtitle': 'Enter the code sent by your friend.',
    'join.code_label': 'Room Code',
    'join.code_placeholder': 'E.g.: a1b2c',
    'join.button': 'Join',
    'join.joining': 'Joining...',

    'room.waiting': 'Waiting for your friend to join...',
    'room.waiting_title': "Your friend hasn't joined yet",
    'room.waiting_desc': 'Send them this code. Once they join, every message is translated into each of your languages.',
    'room.unnamed': 'Untitled chat',
    'room.not_found': 'No room with this code',
    'room.not_found_hint': 'Check the code or ask your friend for a new invite.',
    'room.load_error': "Couldn't open the room",
    'room.back_home': 'Back to home',
    'room.your_code': 'Your Room Code:',
    'room.type_message': 'Type a message...',
    'room.settings': 'Settings',
    'room.my_language': 'My Language',
    'room.partner_language': 'Partner\'s Language',
    'room.auto_detect': 'Auto Detect',
    'room.auto_desc': 'If you choose \'Auto Detect\', the language your partner set will be used (current: {lang}).',
    'room.waiting_partner': 'Waiting...',
    'room.appearance': 'Appearance',
    'room.show_original': 'Show Original Messages',
    'room.leave': 'Leave Room',
    'room.copy': 'Copy Code',
    'room.share': 'Share Link',
    'room.share_whatsapp': 'Send via WhatsApp',
    'room.share_whatsapp_sub': 'Invite via WhatsApp',
    'room.share_link': 'Send Room Link',
    'room.share_link_sub': 'Copy or share link',
    'room.link_copied': 'Room link copied!',
    'room.online': 'Online',
    'room.no_connection': 'No Connection',
    'room.connecting': 'Connecting...',
    
    'msg.translated': 'Translated',
    'msg.error': 'Translation failed',
    'msg.translating': 'Translating...',
    'msg.retry': 'Retry',
    'msg.copy': 'Copy',
    'msg.copied': 'Copied',
    'msg.delivered': 'Delivered',
    'msg.seen': 'Seen',
    'common.save': 'Save',
    'common.saved': 'Saved',
    'quick.title': 'Quick Messages',
    'quick.empty': 'No quick messages yet. Add the ones you type often below.',
    'quick.new': 'New quick message',
    'quick.edit_placeholder': 'Edit message...',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.add': 'Add',
    'common.close': 'Close'
  }
};

// Fallback logic for keys missing in other languages
export const t = (key: string, lang: string, params?: Record<string, string>): string => {
  let str = (translations[lang] || translations.en)[key] || translations.en[key] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      str = str.replace(`{${k}}`, params[k]);
    });
  }
  return str;
};
