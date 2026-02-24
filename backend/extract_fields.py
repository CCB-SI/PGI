import os
from PyPDF2 import PdfReader

def extract_pdf_fields():
    file_path = "/app/templates/pdfs/m02.pdf"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    try:
        reader = PdfReader(file_path)
        fields = reader.get_fields()
        
        if fields:
            print("=== CAMPOS ENCONTRADOS NO PDF ===")
            for key in fields.keys():
                print(f"- {key}")
            print("=================================")
        else:
            print("Nenhum campo de formulário (AcroForm) encontrado neste PDF.")
            print("Parece ser um PDF achatado sem campos preenchíveis.")
    except Exception as e:
        print(f"Erro ao ler PDF: {e}")

if __name__ == "__main__":
    extract_pdf_fields()
