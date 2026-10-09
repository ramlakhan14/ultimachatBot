import { Box, Stack, Text, Button, Input } from "@chakra-ui/react";
import React, { useRef } from 'react'
// import { Editor as TinyMCEEditor } from '@tinymce/tinymce-react'; // Correct import for TinyMCE Editor
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEInstance } from 'tinymce'; // Import TinyMCE instance type
import "./EmailTemplates.css"
export const EmailTemplates = () => {
  const [fileName, setFileName] = React.useState('No file chosen'); // Default text when no file is selected

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Use optional chaining to handle cases where no file is selected
    if (file) {
      setFileName(file.name); // Set the file name to the selected file's name
    } else {
      setFileName('No file chosen'); // Reset to default if no file is selected
    }
  };
  const editorRef = React.useRef<TinyMCEInstance | null>(null);

  const handleEditorChange = () => {
    if (editorRef.current) {
    }
  };
  return (
    <Box>
      <Stack>
        <Box>
          <Text as="h3" fontSize="16px" color="#212529" fontWeight="400">Upload logo</Text>
        </Box>
        <Box width="300px">
          <Box
            display="flex"
            alignItems="center"
            border="1px"
            borderColor="gray.300"
            borderRadius="md"
            overflow="hidden"
          >
            {/* Button to mimic file upload button */}
            <Button
              as="label"
              htmlFor="file-upload"
              variant="outline"
              cursor="pointer"
              borderRightRadius="none"
              borderRight="none"
              fontSize="16px"
              fontWeight="400"
              bg="#E9ECEF"
              _hover={{ bg: '#E9ECEF' }}
            >
              Choose file
            </Button>

            {/* Display the file name */}
            <Text className="line-clamp-1" px={4} py={2} color="gray.500">
              {fileName}
            </Text>

            {/* Hidden input for file upload */}
            <Input
              type="file"
              id="file-upload"
              onChange={handleFileChange} // Call handleFileChange on file selection
              // display="none"
              opacity={0}
              width={'298px'}
              position={'absolute'}
            />
          </Box>
        </Box>
        <Box>
          <Box mt="26px">
            <Text as="h3" fontSize="16px" color="#212529" fontWeight="400" mb="15px">Single Email Text</Text>
            <Editor
              apiKey='1bn8x2cfzs5o2x09snvrey39n9f9cfzkzobkq2wa8ig2ljlr'
              init={{
                plugins: [
                  'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'visualblocks', 'wordcount',
                  'checklist', 'mediaembed', 'casechange', 'export', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 'mentions', 'tableofcontents', 'footnotes', 'autocorrect', 'typography', 'inlinecss', 'markdown',
                ],
                toolbar: 'link undo redo blocks bold italic  align numlist bullist indent outdent',
              }}
              initialValue=""
            />
          </Box>
          <Box mt="26px">
            <Text as="h3" fontSize="16px" color="#212529" fontWeight="400" mb="15px">Bulk Email Text</Text>
            <Editor
              apiKey='1bn8x2cfzs5o2x09snvrey39n9f9cfzkzobkq2wa8ig2ljlr'
              init={{
                plugins: [
                  'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'image', 'link', 'lists', 'media', 'searchreplace', 'visualblocks', 'wordcount',
                  'checklist', 'mediaembed', 'casechange', 'export', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 'mentions', 'tableofcontents', 'footnotes', 'autocorrect', 'typography', 'inlinecss', 'markdown',
                ],
                toolbar: 'link undo redo blocks bold italic align numlist bullist indent outdent',
              }}
              initialValue=""
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
