import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore, Gender } from '../store/useStore';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ArrowRight, User, Pencil } from 'lucide-react';
import { t } from '../lib/i18n';

export default function Profile() {
  const { profile, setProfile } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile.avatarUrl);
  const [status, setStatus] = useState<string>(profile.status || 'online');
  
  // Try to determine where to go next
  const from = (location.state as any)?.from?.pathname || '/';

  const handleContinue = () => {
    if (!name.trim() || !gender) return;
    
    setProfile({ name: name.trim(), gender, avatarUrl, status });
    navigate(from, { replace: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 app-page-bg overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="w-full h-full bg-white rounded-2xl shadow-sm flex items-center justify-center border border-indigo-50 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-indigo-500" />
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 transition-colors active:scale-95"
              title="Profil resmi yükle"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            
            <input 
              type="file" 
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
          
          <h1 className="text-2xl font-semibold text-slate-800">{t('profile.title', profile.language)}</h1>
          <p className="text-slate-500 text-sm">{t('profile.subtitle', profile.language)}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 pl-1">{t('profile.name_label', profile.language)}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 pl-1">{t('profile.gender_label', profile.language)}</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGender('male')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  gender === 'male' 
                    ? "border-indigo-500 bg-indigo-50/50 text-indigo-700" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
                )}
              >
                <span className="text-4xl">👨</span>
                <span className="font-medium">{t('profile.male', profile.language)}</span>
              </button>
              
              <button
                onClick={() => setGender('female')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  gender === 'female' 
                    ? "border-pink-500 bg-pink-50/50 text-pink-700" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
                )}
              >
                <span className="text-4xl">👩</span>
                <span className="font-medium">{t('profile.female', profile.language)}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 pl-1">Durum</label>
            <div className="flex bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden p-1">
              {[
                { id: 'online', label: 'Çevrimiçi', color: 'bg-green-500' },
                { id: 'busy', label: 'Rahatsız Etmeyin', color: 'bg-red-500' },
                { id: 'away', label: 'Dışarıda', color: 'bg-yellow-500' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setStatus(opt.id)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2",
                    status === opt.id 
                      ? "bg-white shadow-sm text-slate-800" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!name.trim() || !gender}
          className="w-full py-4 rounded-xl bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          {t('profile.save', profile.language)}
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}
