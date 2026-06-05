import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateModal from '@/components/create/CreateModal';
import CommunityPostForm from '@/components/create/CommunityPostForm';
import NewsForm from '@/components/create/NewsForm';
import HighlightForm from '@/components/create/HighlightForm';
import PhotoForm from '@/components/create/PhotoForm';
import OfficialPostForm from '@/components/create/OfficialPostForm';
import TransferForm from '@/components/create/TransferForm';
import { Toaster, toast } from 'sonner';

const FORM_COMPONENTS = {
  community: CommunityPostForm,
  news: NewsForm,
  highlight: HighlightForm,
  photo: PhotoForm,
  official: OfficialPostForm,
  transfer: TransferForm,
};

export default function Create() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  const FormComponent = selectedType ? FORM_COMPONENTS[selectedType] : null;

  const handleSelectType = (type) => {
    setSelectedType(type);
  };

  const handleClose = () => {
    setSelectedType(null);
    setShowModal(true);
  };

  const handleSuccess = () => {
    toast.success('Beitrag erfolgreich veröffentlicht!');
    setTimeout(() => {
      navigate('/');
    }, 800);
  };

  return (
    <div className="min-h-screen">
      {/* Initial modal for selecting post type */}
      <CreateModal
        open={showModal && !selectedType}
        onOpenChange={(open) => {
          if (!open && !selectedType) {
            navigate('/');
          } else {
            setShowModal(open);
          }
        }}
        onSelectType={handleSelectType}
      />

      {/* Form dialog */}
      {selectedType && FormComponent && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedType === 'community' && 'Community Post'}
                {selectedType === 'news' && 'Artikel veröffentlichen'}
                {selectedType === 'official' && 'Official Post'}
                {selectedType === 'transfer' && 'Transfer News'}
                {selectedType === 'highlight' && 'Highlight hochladen'}
                {selectedType === 'photo' && 'Fotos hochladen'}
              </DialogTitle>
            </DialogHeader>
            <FormComponent onClose={handleClose} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}