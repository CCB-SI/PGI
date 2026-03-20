import os
from io import BytesIO
from typing import Dict, Any

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

from ..core.s3_storage import s3_storage, S3StorageError

class PDFService:
    def __init__(self, templates_dir: str = "/app/templates/pdfs"):
        self.templates_dir = templates_dir
        os.makedirs(self.templates_dir, exist_ok=True)

    def generate_document(self, template_filename: str, template_data: Dict[str, Any]) -> BytesIO:
        """
        Gera um PDF preenchido a partir do template e mapeamento fornecidos.
        template_filename: Nome do arquivo local no diretório de templates (ex: m02.pdf)
        template_data: Dicionário relacionando os campos do AcroForm com o valor desejado.
        """
        if not fitz:
            raise RuntimeError("Biblioteca PyMuPDF não está instalada. Execute 'uv pip install pymupdf'.")

        template_bytes = None
        if s3_storage.enabled:
            try:
                template_bytes = s3_storage.download_bytes(template_filename)
            except S3StorageError:
                template_bytes = None

        if template_bytes is None:
            file_path = os.path.join(self.templates_dir, template_filename)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Template {template_filename} não encontrado no storage nem no caminho {file_path}.")
            doc = fitz.open(file_path)
        else:
            doc = fitz.open(stream=template_bytes, filetype="pdf")

        # Atualiza os valores dos widgets em todas as páginas
        for page in doc:
            for widget in page.widgets():
                field_name = widget.field_name
                if field_name in template_data:
                    widget.field_value = str(template_data[field_name])
                    widget.update() # O PyMuPDF regenera a aparência visual automaticamente ao salvar/atualizar
        
        output_stream = BytesIO()
        doc.save(output_stream)
        doc.close()
        
        output_stream.seek(0)
        return output_stream

pdf_service = PDFService()
