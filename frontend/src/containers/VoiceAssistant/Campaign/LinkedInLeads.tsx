import { Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, Input, Select, Text, Tr, useToast, Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import React from "react";
import { useForm } from "react-hook-form";
import { callApi } from "../../../services/callApi";
import ReactSelect from "react-select";
import countriesData from "../../Invite Users/Modal/countries.json";
import FileDataPreviewModal from "./FileDataPreviewModal";
type FilePreviewType = {
  isOpen: boolean;
  data: Object | null;
}
interface EmailLeads {
  allRows: any[];
  validPhoneCount?: any;
  validEmailCount?: any;
  invalidPhoneCount?: any;
  invalidEmailCount?: any;
  duplicatePhoneCount?: any;
  duplicateEmailCount?: any;
}
const LinkedInLeads = ({ setCSVErrMsg, disabled, handleMergeLeads, CSVErrMsg, type, emailLeads, setEmailLeads, campaignId }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [keywords, setKeywords] = React.useState<string[]>([]);
  const [customDomains, setCustomDomains] = React.useState<string[]>([]);
  const [emailLeads2, setEmailLeads2] = React.useState<EmailLeads>({ allRows: emailLeads || [] });
  const [selectedCountryOption, setSelectedCountryOption] = React.useState<any>(null);
  const toast = useToast();
  const [filePreview, setFilePreview] = React.useState<FilePreviewType>({ isOpen: false, data: {} });
  const [infoOpen, setInfoOpen] = React.useState(false);


  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      keywords: "",
      customDomains: "",
      location: "",
      query: "",
      resultsLimit: "",
      locations: [],
    },
  });
  const handleAddTag = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "keywords" | "customDomains"
  ) => {
    const inputValue = (e.target as HTMLInputElement).value.trim();

    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      if (type === "keywords") {
        setKeywords((prev) => [...prev, inputValue]);
      } else {
        setCustomDomains((prev) => [...prev, inputValue]);
      }
      (e.target as HTMLInputElement).value = "";
    }
  };



  const onSubmit = async (data: any) => {
    if (type !== "emails") {
      setCSVErrMsg(false);
    }

    const country = typeof selectedCountryOption === "string"
      ? selectedCountryOption
      : selectedCountryOption?.name || (Array.isArray(selectedCountryOption) ? selectedCountryOption[0]?.name : "");

    if (!country) {
      setError("locations", {
        type: "manual",
        message: "Country is required",
      });
      return;
    }

    const payload = {
      query: data.query,
      resultsLimit: Number(data.resultsLimit),
      campaignId: campaignId || "",
      country,
    };

    try {
      setEmailLeads2({ allRows: [] });
      setIsSubmitting(true);
      const response: any = await callApi(`facebook-scrapper/linkedin-scrape`, "post", payload);

      const allRows = response?.allRows || (Array.isArray(response) ? response : []);
      const validRows = response?.validRows || [];
      const hasAllRows = Array.isArray(allRows) && allRows.length > 0;
      const hasValidRows = Array.isArray(validRows) && validRows.length > 0;

      if (!hasAllRows && !hasValidRows) {
        toast({
          title: `Data not found for the given query.`,
          status: "error",
          isClosable: true,
        });
      } else {
        toast({
          title: response?.message || `Data fetched successfully!`,
          status: "success",
          isClosable: true,
        });
      }
      handleMergeLeads(allRows, "linkedinLeads");
      setEmailLeads2(response);
      if (type !== "emails") {
        setEmailLeads(allRows);
      }
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || error?.message || "Server Error ",
        status: "error",
        isClosable: true,
      });
      // console.error("Error fetching email leads:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <Box>
        <form>
          <FormControl isInvalid={!!errors.query} mb={6}>
            <FormLabel htmlFor="query" display="flex" gap="4px" alignItems={"center"}>
              Query
              <Popover isOpen={infoOpen} onClose={() => setInfoOpen(false)}>
                <PopoverTrigger>
                  <Box
                    cursor="pointer"
                    as="span"
                    onClick={() => setInfoOpen(!infoOpen)}
                  >
                    <GoInfo color="#6C757D" />
                  </Box>
                </PopoverTrigger>
                <PopoverContent
                  bg="#efefef"
                  fontWeight={500}
                  color="#333"
                  p={4}
                  width="250px"
                  fontSize="12px"
                  border="1px solid #ccc"
                  lineHeight="20px"
                  style={{ boxShadow: 'none' }}
                  borderRadius="4px"
                >
                  <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                  {/* <PopoverCloseButton /> */}
                  <Box whiteSpace="pre-wrap">
                    Enter job titles or industries (e.g., CEO, founder, real estate agent).
                  </Box>
                </PopoverContent>
              </Popover>
              <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
            </FormLabel>

            <Input
              id="query"
              disabled={disabled}
              placeholder="Please enter your query"
              {...register("query", { required: "Query is required" })}
            />
            <FormErrorMessage>{errors.query?.message}</FormErrorMessage>
          </FormControl>


          <FormControl isInvalid={!!errors.resultsLimit} mb={6}>
            <FormLabel htmlFor="limit">Limit  <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
            <Select
              width="auto"
              disabled={disabled}
              color="#6C757D"
              {...register('resultsLimit', { required: 'Limit is required' })}
            >
              <option value={''}>Select Limit</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
            <FormErrorMessage>{errors?.resultsLimit?.message}</FormErrorMessage>
          </FormControl>

          <FormControl
            isInvalid={!selectedCountryOption && !!errors.locations}
            mb={6}
          >
            <FormLabel>
              Country{" "}
              <Text as="span" color="#DC3545">
                *
              </Text>
            </FormLabel>

            <ReactSelect
              options={countriesData}
              isDisabled={disabled}
              value={selectedCountryOption}
              menuPlacement="bottom"
              menuPosition="fixed"
              getOptionLabel={(option: any) => option.name}
              getOptionValue={(option: any) => option.name}
              placeholder="Select Country"
              onChange={(selected: any) => {
                setSelectedCountryOption(selected);

                if (selected) {
                  clearErrors("locations");
                } else {
                  setError("locations", {
                    type: "manual",
                    message: "Country is required",
                  });
                }
              }}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: errors.locations
                    ? "#E53E3E"
                    : state.isFocused
                    ? "#3182CE"
                    : "#E2E8F0",
                  boxShadow: "none",
                  "&:hover": {
                    borderColor: errors.locations ? "#E53E3E" : "#3182CE",
                  },
                }),
              }}
            />

            <FormErrorMessage>
              {errors.locations?.message}
            </FormErrorMessage>
          </FormControl>

          {CSVErrMsg && (
            <Text color="#e53e3e" fontSize="14px">
              No valid rows exists for this campaign.
            </Text>
          )}

          {/* Submit */}
          <FormControl textAlign="right">
            <Button
              fontWeight={500}
              disabled={disabled}
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              Submit Query
            </Button>
          </FormControl>
        </form>

        {/* {
          emailLeads2?.allRows?.length > 0 &&
          <Text
            sx={{
              cursor: "pointer",
              fontSize: "13px",
              color: "#2977FF",
              transition: "all .2s ease-in-out",
              ":hover": { textDecoration: "underline", color: "#2977FF" }
            }}
            onClick={() => { setFilePreview({ isOpen: true, data: emailLeads2 }) }}
          >
            Preview Data
          </Text>
        } */}
        {/* Results */}
        {emailLeads2?.allRows?.length > 0 &&
          (
            <Box
              border="1px solid #D6BFFB"
              bg="#e3f3ff"
              mt="5px"
              p={"4px 8px"}
              w="fit-content"
              color={"#6C757D"}
              borderRadius="md"
            >
              <Flex wrap="wrap" gap={4} align="center">
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Valid Number: <Text as="span" color="green.500" fontWeight="semibold">
                    ({emailLeads2?.validPhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                    ({emailLeads2?.validEmailCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Invalid Number: <Text as="span" color="red.500" fontWeight="semibold">
                    ({emailLeads2?.invalidPhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                    ({emailLeads2?.invalidEmailCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Duplicate Number: <Text as="span" color="orange.400" fontWeight="semibold">
                    ({emailLeads2?.duplicatePhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Duplicate Email: <Text as="span" color="orange.400" fontWeight="semibold">
                    ({emailLeads2?.duplicateEmailCount || "0"})
                  </Text>
                </Text>
              </Flex>
            </Box>

            // <TableComponent
            //   data={emailLeads || []}
            //   tableDataKeys={[""]}
            //   tableHeader={["Email", "Phone", "WebSite Url"]}
            //   customRowRenderer={(data: any, index: number) => {
            //     return (
            //       <Tr key={data?.campaignId}>
            //         <Td>{index + 1}</Td>
            //         <Td>{data?.email || "NA"}</Td>
            //         <Td>{data?.phoneNumber || "NA"}</Td>
            //         <Td>{data?.websiteUrl || "NA"}</Td>
            //         {/* <Td>  <Button
            //           size="sm"
            //           fontSize={12}
            //           variant="outline"
            //           borderColor="transparent"
            //           onClick={() =>
            //             delCampaignEmail(data?.email, campaignId)
            //           }
            //           mr={2}
            //           sx={{
            //             _focus: {
            //               boxShadow: "none", // Removes the focus box shadow
            //             },
            //           }}
            //         >
            //           <svg
            //             width="14"
            //             height="16"
            //             viewBox="0 0 14 16"
            //             fill="none"
            //             xmlns="http://www.w3.org/2000/svg"
            //           >
            //             <path
            //               d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
            //               fill="#DC3545"
            //             />
            //             <path
            //               fillRule="evenodd"
            //               clipRule="evenodd"
            //               d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
            //               fill="#DC3545"
            //             />
            //           </svg>
            //         </Button></Td> */}
            //       </Tr>
            //     )
            //   }} />

          )}
      </Box>

      <FileDataPreviewModal modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {} }) }} />
    </>
  );
};

export default LinkedInLeads;
