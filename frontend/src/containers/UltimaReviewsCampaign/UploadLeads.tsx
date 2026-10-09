import {
  Box,
  Button,
  Text,
  Input,
  Image,
  Flex,
  useToast,
  keyframes
} from "@chakra-ui/react";
import React, { useState, useRef } from "react";

import ExcelLogo from './excelLogo.svg';
import CsvFile from './Ultima-leads.csv';

import { csvParseAndSaveLeadData } from "../../services/UltimaReviewsConnection";

const moveStripes = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 56.57px 0;
  }
`;
const UploadLeads = ({ emailLeads, setEmailLeads }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [dataPriview, setdataPriview] = useState<any>({ allRows: [] });

  const animation = `${moveStripes} 1s linear infinite`;

  const toast = useToast();

  const handleExcelButton = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle when a file is selected - simulates file upload
  const handleFileChange = async (e: any) => {
    const fileInput = e.target;
    const file = fileInput.files?.[0];
    setEmailLeads([]);
    setSelectedFileName("");
    if (file) {
      setSelectedFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);
      try {
        setUploadingFile(true);
        const response: any = await csvParseAndSaveLeadData(formData);
        setEmailLeads(response.data.data?.allRows);
        setdataPriview(response.data.data);
        if (response.status === 200 && response.data.data.length > 0) {
        } else {
          setEmailLeads([]);
        }

      } catch (error: any) {
        toast({
          title: error?.response?.data?.message,
          status: "error",
          isClosable: true,
        });
      } finally {
        setUploadingFile(false);
        fileInput.value = null; // Clear the file input value after processing
      }
    }
  };

  return (
    <>
      <Box
        textAlign="center"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
      >
        <Image src={ExcelLogo} alt='excel logo' />
        <Input
          type="file"
          ref={fileInputRef}
          display="none" // Hide the file input
          onChange={handleFileChange}
          accept=".csv" // Only allow CSV files
        />
        {!uploadingFile ? (
          <>
            <Button
              colorScheme="blue"
              onClick={handleExcelButton}
              mb="12px"
              mt="12px"
              _focus={{
                boxShadow: 'none'
              }}
            >
              <Text as="span" ms="4px" fontSize="16px" fontWeight="500">
                Upload File
              </Text>
            </Button>

            <Text
              as="p"
              fontSize="12px"
              fontWeight="400"
              color="#6C757D"
              pb="24px"
            >
              {selectedFileName}
            </Text>

            <Text
              as="p"
              fontSize="12px"
              fontWeight="400"
              color="#6C757D"
              pb="24px"
            >
              Download a{' '}
              <Text
                as="a"
                href={CsvFile}
                download="sample.csv"
                color="#2977FF"
                _hover={{
                  color: "#2977FF"
                }}
              >
                sample CSV
              </Text>
            </Text>
          </>
        ) : (
          <>
            <Box w="full" maxW="md" mx="auto" p={4}>
              <Box
                w="200px"
                margin="auto"
                h="4"
                overflow="hidden"
                bg="repeating-linear-gradient(45deg, rgb(168, 85, 247) 0px, rgb(168, 85, 247) 9px, #efefef 2px, #efefef 15px) 0% 0% / 42.57px 30.87px"
                bgSize="20.57px 19.57px"
                animation={animation}
              />
            </Box>
            <Box>
              <Text textAlign="center" color="gray" fontSize="14px" mb="10px">
                Uploading file...
              </Text>
            </Box>
          </>
        )}
      </Box>

      {
        dataPriview?.allRows?.length > 0 && (
          <Box
            border="1px solid #2a77ff29"
            bg="#e3f3ff"
            my="15px"
            p={"4px 8px"}
            w="fit-content"
            color={"#6C757D"}
            borderRadius="md"
          >
            <Flex wrap="wrap" gap={4} align="center">
              <Text fontWeight={"400"} fontSize={"14px"}>
                Valid Number: <Text as="span" color="green.500" fontWeight="semibold">
                  ({dataPriview?.validPhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                  ({dataPriview?.validEmailCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Invalid Number: <Text as="span" color="red.500" fontWeight="semibold">
                  ({dataPriview?.invalidPhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                  ({dataPriview?.invalidEmailCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Duplicate Number: <Text as="span" color="orange.400" fontWeight="semibold">
                  ({dataPriview?.duplicatePhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Duplicate Email: <Text as="span" color="orange.400" fontWeight="semibold">
                  ({dataPriview?.duplicateEmailCount || "0"})
                </Text>
              </Text>
            </Flex>
          </Box>
        )
      }

    </>

  );
}

export default UploadLeads;