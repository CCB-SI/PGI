import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="main-footer">
            <div className="container footer-content">
                <div className="footer-section">
                    <h3>Secretaria Musical</h3>
                    <p>Regional SAI – Santa Isabel, Arujá e Igaratá. Centralização de informações técnicas, calendários de ensaios e suporte aos músicos.</p>
                </div>
                <div className="footer-section">
                    <h3>Links Rápidos</h3>
                    <Link href="/locais">Localidades</Link>
                    <Link href="/ensaios">Ensaios</Link>
                    <Link href="/informativos">Informativos</Link>
                    <Link href="/downloads">Downloads</Link>
                    <Link href="/contato">Contato</Link>
                </div>
                <div className="footer-section">
                    <h3>Contato</h3>
                    <p>Dúvidas técnicas ou solicitações:</p>
                    <Link href="/contato">Enviar mensagem →</Link>
                    <div style={{ marginTop: '20px' }}>
                        <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Área do Editor / Admin →</Link>
                    </div>
                </div>
            </div>
            <div className="container footer-bottom">
                &copy; {new Date().getFullYear()} Secretaria Musical – Regional SAI. Todos os direitos reservados.
            </div>
        </footer>
    );
}
