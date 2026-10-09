import { Box, Flex, Icon, IconButton, Text, VStack } from '@chakra-ui/react'
import { useField } from 'formik'
import React from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { FiTrash, FiUpload } from 'react-icons/fi'

type CustomDropzoneProps = {
    name: string;
    label?: string;
    helperText?: string;
}

const CustomDropzone = React.forwardRef(({ name, label, helperText }: CustomDropzoneProps, innerRef: React.Ref<any>) => {

    const [field, meta, helpers] = useField(name);

    const handleDrop = (acceptedFiles: File[]) => {
        // Check if any file size is greater than 5MB
        const hasOversizedFile = acceptedFiles.some((file) => file.size > 5 * 1024 * 1024); // 5MB in bytes

        if (hasOversizedFile) {
            helpers.setError('One or more files exceed the maximum allowed size of 5MB');

            return;
        }

        if (acceptedFiles.length + field.value.length > 5) {
            helpers.setError('You can only upload a maximum of 5 files at a time');

            return;
        }

        helpers.setValue([...field.value, ...acceptedFiles]);

    };

    const clearFiles = () => {
        helpers.setValue([]); // Clear the files
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: {
            //'text/html': ['.html'],
            'application/pdf': ['.pdf'],
            // 'application/vdn.openxmlformats-officedocument.wordprocessingml.document': ['.docx', '.doc'],
            // 'application/ms-word': ['.docx', '.doc'],
            // 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
        },
        multiple: true,
        // maxFiles: 5,
        // maxSize: 1024 * 1024 * 5,
    });

    React.useImperativeHandle(innerRef, () => ({
        clearFiles,
    }));

    React.useEffect(() => {

    }, [innerRef]);

    return (
        <Box>

            <Box
                w="100%"
                justifyContent="center"  // Updated from 'justify' to 'justifyContent'
                alignItems="center"       // Assuming 'align' should be 'alignItems'
                borderWidth={2}
                borderRadius="2px"
                textAlign="center"
                bg="#F8F9FA"
                _focus={{
                    outline: "none",
                    borderColor: "#A873F5",
                }}
                {...getRootProps()}>
                <input {...getInputProps()} />
                {/* <Icon as={FiUpload} w={10} h={10} p={2} mb={2} /> */}
                <Box display="flex" justifyContent="center" alignItems="center" mt="16px" mb="20px">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.9396 11.9991C14.7148 11.9995 14.4929 12.0503 14.2904 12.1479C14.0879 12.2456 13.9099 12.3875 13.7696 12.5631L4.61959 23.9991H17.9996C18.3974 23.9991 18.7789 24.1572 19.0602 24.4385C19.3416 24.7198 19.4996 25.1013 19.4996 25.4991C19.4996 26.6926 19.9737 27.8372 20.8176 28.6811C21.6615 29.525 22.8061 29.9991 23.9996 29.9991C25.1931 29.9991 26.3377 29.525 27.1816 28.6811C28.0255 27.8372 28.4996 26.6926 28.4996 25.4991C28.4996 25.1013 28.6576 24.7198 28.9389 24.4385C29.2202 24.1572 29.6018 23.9991 29.9996 23.9991H43.3796L34.2296 12.5631C34.0893 12.3875 33.9113 12.2456 33.7088 12.1479C33.5063 12.0503 33.2844 11.9995 33.0596 11.9991H14.9396ZM44.8016 26.9991H31.3496C31.0053 28.6946 30.0855 30.2189 28.746 31.3137C27.4065 32.4086 25.7296 33.0067 23.9996 33.0067C22.2696 33.0067 20.5927 32.4086 19.2532 31.3137C17.9137 30.2189 16.9939 28.6946 16.6496 26.9991H3.19759L4.15759 34.6851C4.20298 35.0484 4.37963 35.3825 4.65426 35.6245C4.92888 35.8665 5.28253 35.9998 5.64859 35.9991H42.3506C42.7161 35.999 43.0691 35.8655 43.3431 35.6235C43.6171 35.3815 43.7933 35.0479 43.8386 34.6851L44.7986 26.9991H44.8016ZM11.4266 10.6881C11.8484 10.1609 12.3834 9.73526 12.9921 9.44289C13.6007 9.15051 14.2674 8.99885 14.9426 8.99915H33.0566C33.7318 8.99885 34.3985 9.15051 35.0071 9.44289C35.6158 9.73526 36.1508 10.1609 36.5726 10.6881L47.6726 24.5631C47.7973 24.7197 47.8894 24.8996 47.9435 25.0923C47.9976 25.285 48.0126 25.4866 47.9876 25.6851L46.8176 35.0571C46.6815 36.1458 46.1525 37.1473 45.3298 37.8732C44.5072 38.5992 43.4477 38.9996 42.3506 38.9991H5.64859C4.55146 38.9996 3.49196 38.5992 2.66934 37.8732C1.84671 37.1473 1.31763 36.1458 1.18159 35.0571L0.0115904 25.6851C-0.0129984 25.4864 0.00247168 25.2847 0.0570879 25.092C0.111704 24.8993 0.20436 24.7195 0.32959 24.5631L11.4296 10.6881H11.4266Z" fill="#2977FF" />
                    </svg>
                </Box>
                {isDragActive ? (
                    <Text fontSize="sm" color="gray.500">Drop the files here ...</Text>
                ) : (
                    <Box>
                        <Text fontSize="16px" color="#212529" mb="4px">Drag and drop PDF files</Text>
                        <Text fontSize="14px" color="#6C757D" mb="16px">Support for a single or bulk upload. Maximum file size 25MB.</Text>
                    </Box>
                )}
                {meta.error ? (
                    <Text fontSize="sm" color="red.400">{meta.error}</Text>
                ) : null}

            </Box>
            <Text mt={2} fontSize="sm" color="gray.400">{helperText}</Text>
            <Box
                mt={4}
                maxH="320px"
                overflowY="auto">
                {field.value.length > 0 && (
                    <VStack mt={4} align="stretch" spacing={2} >
                        {field.value.map((file: File, index: number) => (
                            <Flex key={index} align="center" justifyContent="space-between" borderBottom="1px" borderColor="gray.200" p={2}>
                                <Text fontSize="sm">{file.name}</Text>
                                <IconButton
                                    aria-label="Delete file"
                                    ml={2}
                                    size="xs"
                                    icon={<FiTrash />}
                                    onClick={() => {
                                        const updatedFiles = [...field.value];
                                        updatedFiles.splice(index, 1);
                                        helpers.setValue(updatedFiles);
                                    }}
                                />
                            </Flex>
                        ))}
                    </VStack>
                )}
            </Box>

        </Box >

    )
});

export default CustomDropzone