<?php
class PDFParser {
    private $pdfRoot;

    public function __construct() {
        $this->pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
    }

    public function extractText($grade, $subject, $chapter, $questionName) {
        $pdfPath = $this->pdfRoot . "$grade/$subject/$chapter/$questionName.pdf";
        
        // Debug information
        error_log("Attempting to read PDF from: " . $pdfPath);
        
        if (!file_exists($pdfPath)) {
            error_log("PDF file not found at: " . $pdfPath);
            throw new Exception("PDF file not found at: " . $pdfPath);
        }

        // Debug: Check if pdftotext is available
        exec("where pdftotext", $output, $returnVar);
        if ($returnVar !== 0) {
            error_log("pdftotext not found in PATH");
            throw new Exception("pdftotext utility not found");
        }

        // Using pdftotext for text extraction
        $command = "pdftotext \"$pdfPath\" -";
        error_log("Executing command: " . $command);
        
        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);
        
        if ($returnVar !== 0) {
            error_log("Error executing pdftotext. Return code: " . $returnVar);
            throw new Exception("Failed to extract text from PDF");
        }

        $text = implode("\n", $output);
        error_log("Extracted text length: " . strlen($text));
        
        return $text;
    }

    public function extractMultipleTexts($grade, $subject, $chapter, $questionNames) {
        $texts = [];
        
        foreach ($questionNames as $question) {
            try {
                $texts[] = $this->extractText($grade, $subject, $chapter, $question);
            } catch (Exception $e) {
                // Log error but continue with other files
                error_log("Error extracting text from $question: " . $e->getMessage());
            }
        }
        
        return implode("\n\n--- Next Question ---\n\n", $texts);
    }
}
?>
