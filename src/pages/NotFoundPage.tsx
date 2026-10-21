import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { EmptyState } from '../components/Ui';
import { buttonClass } from '../components/Button';
import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <div className="container page">
      <PageHeader
        eyebrow="Error 404"
        title="Página no encontrada"
        subtitle="La dirección que abriste no existe o cambió de lugar."
      />
      <div className="card">
        <EmptyState
          icon={<Compass size={22} />}
          title="No encontramos esta página"
          text="Vuelve al panel para continuar con el estudio. Si el problema persiste, cierra sesión y vuelve a ingresar."
          actions={
            <Link to="/" className={buttonClass({ variant: 'primary' })}>
              <Home size={15} />
              Volver al panel
            </Link>
          }
        />
      </div>
    </div>
  );
}
