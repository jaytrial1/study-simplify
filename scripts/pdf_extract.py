import sys
import json
import PyPDF2
import logging
from pathlib import Path
import io

# Set UTF-8 encoding for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def extract_pdf_text(pdf_path):
    try:
        # Validate file
        pdf_file = Path(pdf_path)
        if not pdf_file.exists():
            return {
                'success': False,
                'error': 'PDF file not found'
            }
            
        with open(pdf_file, 'rb') as file:
            # Create PDF reader object
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Get total number of pages
            num_pages = len(pdf_reader.pages)
            
            # Extract text from all pages
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text() + '\n'
            
            # Get file size
            file_size = pdf_file.stat().st_size
            
            return {
                'success': True,
                'text': text.strip(),
                'pages': num_pages,
                'size': file_size
            }
                
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                'success': False,
                'error': 'No PDF path provided'
            }))
            sys.exit(1)
            
        result = extract_pdf_text(sys.argv[1])
        
        # Ensure proper JSON encoding
        print(json.dumps(result, ensure_ascii=False))
        sys.stdout.flush()
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f"Script execution failed: {str(e)}"
        }, ensure_ascii=False)) 