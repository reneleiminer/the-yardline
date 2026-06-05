import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function ProfessionalForm({ card, appUser, onClose }) {
  const Icon = card.icon;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    portfolioLink: '',
    website: '',
    instagramHandle: '',
    shortDescription: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleActivate = async () => {
    setSaving(true);
    // Map to correct legacy role name + new slug
    const roleNameMap = {
      journalist: { role: 'Journalist', roleSlug: 'journalist' },
      photographer: { role: 'Fotograf', roleSlug: 'photographer' },
      creator: { role: 'Creator', roleSlug: 'creator' },
    };
    const roleData = roleNameMap[card.role] || { role: card.role, roleSlug: card.role.toLowerCase() };
    // Immediately self-activate
    await base44.auth.updateMe({
      role: roleData.role,
      roleSlug: roleData.roleSlug,
    });

    // Create application for optional verification
    if (form.portfolioLink || form.shortDescription) {
      await base44.entities.RoleApplication.create({
        userId: appUser.id,
        username: appUser.username,
        applicationType: 'professional',
        requestedRole: card.role,
        name: appUser.displayName || appUser.username,
        email: '',
        portfolioLink: form.portfolioLink,
        website: form.website,
        instagramHandle: form.instagramHandle,
        shortDescription: form.shortDescription,
        status: 'pending',
      });
    }

    qc.invalidateQueries(['my-applications']);
    setSaving(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="px-4 pt-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-black">{card.label}-Konto aktiviert!</h2>
        <p className="text-sm text-muted-foreground">
          Dein Account ist jetzt als <strong>{card.label}</strong> aktiv. Eine Verifizierung erhöht deine Sichtbarkeit auf der Plattform.
        </p>
        <Button onClick={onClose} className="rounded-full mt-4">Fertig</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
          <Icon className="w-5 h-5" style={{ color: card.color }} />
        </div>
        <div>
          <h2 className="font-black text-lg">{card.label}</h2>
          <p className="text-xs text-muted-foreground">Professionelles Konto</p>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-5 flex gap-2.5">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary/90 leading-relaxed">
          Dein Konto wird <strong>sofort aktiviert</strong>. Die Verifizierung durch unser Team erhöht deine Sichtbarkeit und schaltet ein Verifizierungsabzeichen frei. Sie ist optional, aber empfohlen.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Portfolio / Bewerbungslink" hint="Website, YouTube-Kanal, Artikel etc.">
          <Input value={form.portfolioLink} onChange={e => set('portfolioLink', e.target.value)} className="bg-secondary border-border/50" placeholder="https://..." />
        </Field>

        <Field label="Website">
          <Input value={form.website} onChange={e => set('website', e.target.value)} className="bg-secondary border-border/50" placeholder="https://..." />
        </Field>

        <Field label="Instagram / TikTok">
          <Input value={form.instagramHandle} onChange={e => set('instagramHandle', e.target.value)} className="bg-secondary border-border/50" placeholder="@username" />
        </Field>

        <Field label="Kurzbeschreibung" hint="Wer bist du und was machst du?">
          <Textarea value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} className="bg-secondary border-border/50 resize-none" rows={3} placeholder="Erzähl uns kurz von dir..." />
        </Field>

        <Button onClick={handleActivate} disabled={saving} className="w-full rounded-full mt-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Als ${card.label} aktivieren`}
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full rounded-full">Abbrechen</Button>
      </div>
    </div>
  );
}