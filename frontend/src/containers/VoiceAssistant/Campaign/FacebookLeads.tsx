import { Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, Input, useToast, Select, Tag, TagCloseButton, TagLabel, Td, Text, Tr, Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import React from "react";
import { useForm } from "react-hook-form";
import { facebookScrapeLeadsData } from "../../../services/UltimaReviewsConnection";
import Multiselect from "multiselect-react-dropdown";
import ReactSelect from "react-select";
import countriesData from "../../Invite Users/Modal/countries.json";
import TableComponent from "../../TableComponent";
import FileDataPreviewModal from "./FileDataPreviewModal";
type FilePreviewType = {
  isOpen: boolean;
  data: Object | null;
}
const FacebookLeads = ({ emailLeads, disabled, handleMergeLeads, setEmailLeads, setCSVErrMsg, CSVErrMsg }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [voiceBotLeads, setVoiceBotLeads] = React.useState<any>({ allRows: [], validRows: emailLeads || [] });
  const [query, setquery] = React.useState<string[]>([]);
  const [selectedCountryOption, setSelectedCountryOption] = React.useState<any>([]);
  const [filePreview, setFilePreview] = React.useState<FilePreviewType>({ isOpen: false, data: {} });
  const toast = useToast();
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [resultsLimit, setResultsLimit] = React.useState<any>("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      // query: "",
      // limit: null,
      query: [],
      resultsLimit: null,
      locations: [],
    },
  });

  // console.log("Form Data: ", CSVErrMsg);


  const onSubmit = async (data: any) => {
    // console.log("Form Data: ", CSVErrMsg);
    setCSVErrMsg(false);
    if (query.length == 0) {
      setError("query", { type: "manual", message: "Query is required" });
      return;
    }
    if (!resultsLimit) {
      setError("resultsLimit", { type: "manual", message: "Limit is required" });
      return;
    }
    if (!selectedCountryOption?.length) {
      setError("locations", {
        type: "required",
        message: "Country is required",
      });
      return;
    }
    const locations = selectedCountryOption?.map((item: any) => { return item?.name })
    const payload = { ...data, resultsLimit: Number(resultsLimit), query: query, locations };

    try {
      setEmailLeads([]);
      setIsSubmitting(true);
      const response: any = await facebookScrapeLeadsData(payload);
      if (response.status === 200) {
        setVoiceBotLeads(response.data);
        const hasAllRows = Array.isArray(response.data?.allRows) && response.data?.allRows?.length > 0;
        const hasValidRows = Array.isArray(response.data?.validRows) && response.data?.validRows?.length > 0;

        if (!hasAllRows && !hasValidRows) {
          toast({
            title: `Data not found for the given query.`,
            status: "error",
            isClosable: true,
          });
        } else {
          toast({
            title: response.data?.message || `Data fetched successfully!`,
            status: "success",
            isClosable: true,
          });
        }
        setEmailLeads({ validRows: response.data?.validRows || [] });
        handleMergeLeads(response.data?.allRows || [], "facebookLeads");

        setCSVErrMsg(false);
      } else {

      }
    }
    catch (error: any) {
      toast({
        title: error?.response?.data?.message || error?.message || "Please Enter valid query",
        status: "error",
        isClosable: true,
      });
      // console.error("Error fetching email leads:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleAddTag = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "query" | "customDomains"
  ) => {
    const inputValue = (e.target as HTMLInputElement).value.trim();

    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      if (type === "query") {
        setquery((prev) => [...prev, inputValue]);
      }
      (e.target as HTMLInputElement).value = "";
    }
  };


  const removeTag = (index: number, type: "query" | "customDomains") => {
    if (type === "query") {
      setquery((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // console.log("emailLeads this", !query.length, errors.query);


  return (
    <>
      <Box>
        <form>

          <FormControl isInvalid={!query.length && !!errors.query} mb={4}>
            <FormLabel htmlFor="query" display="flex" gap="4px" alignItems={"center"}>
              Query<small>(Type query and press Enter)</small>

              <Text as="span" fontSize="14px" fontWeight="400" color="#DC3545">*</Text>
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
                    Enter keywords to search (e.g., real estate, website owner). Multiple queries allowed.
                  </Box>
                </PopoverContent>
              </Popover>
            </FormLabel>

            <Input
              id="query"
              disabled={disabled}
              placeholder="Type query and press Enter"
              required
              _focus={{ outline: "none" }}
              onKeyDown={(e) => handleAddTag(e, "query")}
            />
            {
              query.length > 0 && (
                <Flex gap={2} wrap="wrap" my={2} border="1px solid #E2E8F0" borderRadius="md" p={2}>
                  {query.map((tag: any, index) => (
                    <Tag key={index} borderRadius="full" variant="solid" colorScheme="blue">
                      <TagLabel>{tag}</TagLabel>
                      <TagCloseButton onClick={() => removeTag(index, "query")} />
                    </Tag>
                  ))}

                </Flex>)

            }
            {errors.query &&
              <FormErrorMessage>Query are required</FormErrorMessage>
            }
          </FormControl>

          <FormControl isInvalid={!!errors.resultsLimit} mb={4}>
            <FormLabel htmlFor="limit">Limit  <Text as={"span"} fontSize="14px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
            <Select
              disabled={disabled}
              width="auto"
              color="#6C757D"
              // {...register('resultsLimit', { required: 'Limit is required' })}
              value={resultsLimit}
              // {...register('resultsLimit', { required: 'Limit is required' })}
              onChange={(e: any) => {
                setResultsLimit(e.target.value)
                if (e.target.value) {
                  clearErrors("resultsLimit");
                }
              }}
            >
              <option value={''}>Select Limit</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
            <FormErrorMessage>{errors.resultsLimit?.message}</FormErrorMessage>
          </FormControl>


          {/* <Flex gap={2}>
            <Box mb={"15px"} w={"100%"}>
              <Text fontSize={'14px'} fontWeight={400} mb={'8px'} marginRight="8px">
                Country{" "}
                <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">
                  *
                </Text>
              </Text>
              <Multiselect
                options={countriesData}
                // singleSelect
                disable={disabled}
                // multiple={true}
                selectedValues={selectedCountryOption}
                // selectedValues={selectedCountryOption ? [selectedCountryOption] : []}
                // onSelect={(list) => { setSelectedCountryOption(list) }}
                // onRemove={(list) => { setSelectedCountryOption(list) }}
                onSelect={(list) => {
                  setSelectedCountryOption(list);
                  clearErrors("locations");
                }}

                onRemove={(list) => {
                  setSelectedCountryOption(list);
                  if (list.length === 0) {
                    setError("locations", {
                      type: "required",
                      message: "Country is required",
                    });
                  } else {
                    clearErrors("locations");
                  }
                }}
                displayValue={"name"}
                showCheckbox={false} // Hide checkboxes for single select
                placeholder="Select an option"
              // search={true} // Enable the search box
              />
              <FormErrorMessage>
                {errors?.locations?.message}
              </FormErrorMessage>
            </Box>

          </Flex> */}
          <FormControl
            isInvalid={selectedCountryOption.length === 0 && !!errors.locations}
            mb={4}
          >
            <FormLabel>
              Country{" "}
              <Text as="span" color="#DC3545">
                *
              </Text>
            </FormLabel>

            <ReactSelect
              isMulti
              options={countriesData}
              isDisabled={disabled}
              value={selectedCountryOption}
              menuPlacement="bottom"
              menuPosition="fixed"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              getOptionLabel={(option: any) => option.name}
              getOptionValue={(option: any) => option.name}
              placeholder="Select Country"
              onChange={(selected: any) => {
                const values = selected || [];
                setSelectedCountryOption(values);

                if (values.length > 0) {
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

                multiValue: (base) => ({
                  ...base,
                  backgroundColor: "#3182CE",
                  borderRadius: "14px",
                }),

                multiValueLabel: (base) => ({
                  ...base,
                  color: "#fff",
                  fontWeight: 500,
                }),

                multiValueRemove: (base) => ({
                  ...base,
                  color: "#fff",
                  ":hover": {
                    backgroundColor: "#2B6CB0",
                    color: "#fff",
                  },
                }),
              }}
            />

            <FormErrorMessage>
              {errors.locations?.message}
            </FormErrorMessage>
          </FormControl>


          {CSVErrMsg && <Text color="#e53e3e" fontSize={'14px'}>No  valid row available  exists for this campaign.</Text>}

          <FormControl textAlign={"right"}>
            <Button
              mt={4}
              colorScheme="blue"
              type="button"
              fontWeight={500}
              isLoading={isSubmitting}
              disabled={disabled || isSubmitting}
              // disabled={true}
              onClick={() => {
                onSubmit({})
              }}
            >
              Submit Query
            </Button>
          </FormControl>
        </form>
        {
          voiceBotLeads?.allRows?.length > 0 &&
          <Text
            sx={{
              cursor: "pointer",
              fontSize: "13px",
              color: "#2977FF",
              transition: "all .2s ease-in-out",
              ":hover": { textDecoration: "underline", color: "#2977FF" }
            }}
            onClick={() => { setFilePreview({ isOpen: true, data: voiceBotLeads }) }}
          >
            Preview Data
          </Text>
        }
        {voiceBotLeads?.allRows?.length > 0 &&
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
                  ({voiceBotLeads?.validPhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                  ({voiceBotLeads?.validEmailCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Invalid Number: <Text as="span" color="red.500" fontWeight="semibold">
                  ({voiceBotLeads?.invalidPhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                  ({voiceBotLeads?.invalidEmailCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Duplicate Number: <Text as="span" color="orange.400" fontWeight="semibold">
                  ({voiceBotLeads?.duplicatePhoneCount || "0"})
                </Text>
              </Text>
              <Text fontWeight={"400"} fontSize={"14px"}>
                Duplicate Email: <Text as="span" color="orange.400" fontWeight="semibold">
                  ({voiceBotLeads?.duplicateEmailCount || "0"})
                </Text>
              </Text>
            </Flex>
          </Box>

          // <Box my="24px">
          //   <TableComponent
          //     data={voiceBotLeads || []}
          //     tableDataKeys={[""]}
          //     tableHeader={["Email", "Phone", "Website Url"]}
          //     customRowRenderer={(data: any, index: number) => {
          //       return (
          //         <Tr key={data?.campaignId}>
          //           <Td>{index + 1}</Td>
          //           <Td>{data?.phone || "NA"}</Td>
          //           <Td>{data?.email || "NA"}</Td>
          //           <Td>{data?.websiteUrl || "NA"}</Td>
          //           {/* <Td>  <Button
          //             size="sm"
          //             fontSize={12}
          //             variant="outline"
          //             borderColor="transparent"
          //             onClick={() => { }
          //               // delCampaignEmail(data?.email, campaignId)
          //             }
          //             mr={2}
          //             sx={{
          //               _focus: {
          //                 boxShadow: "none", // Removes the focus box shadow
          //               },
          //             }}
          //           >
          //             <svg
          //               width="14"
          //               height="16"
          //               viewBox="0 0 14 16"
          //               fill="none"
          //               xmlns="http://www.w3.org/2000/svg"
          //             >
          //               <path
          //                 d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
          //                 fill="#DC3545"
          //               />
          //               <path
          //                 fillRule="evenodd"
          //                 clipRule="evenodd"
          //                 d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
          //                 fill="#DC3545"
          //               />
          //             </svg>
          //           </Button></Td> */}
          //         </Tr>
          //       )
          //     }}
          //   />
        }
      </Box>
      <FileDataPreviewModal modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {} }) }} />
    </>
  );
};

export default FacebookLeads;
