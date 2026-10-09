import { Box, Button, Flex, FormControl, FormErrorMessage, useToast, FormLabel, Input, Select, Tag, TagCloseButton, TagLabel, Text, Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import React from "react";
import { useForm } from "react-hook-form";
import { facebookScrapeLeadsData } from "../../services/UltimaReviewsConnection";
import { triggerCampaign } from "../../services/emailCampaigns";
import countriesData from "../Invite Users/Modal/countries.json";
import { useHistory } from "react-router-dom";
import TableComponent from "../TableComponent";
import ReactSelect from "react-select";
import FileDataPreviewModal from "../VoiceAssistant/Campaign/FileDataPreviewModal";
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
const FacebookLeadsForDetailsCampaign = ({ subTab, disabled, campaignId, handleMergeLeads, delCampaignEmail, leadsForFacebook }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [emailLeads, setEmailLeads] = React.useState<EmailLeads>({ allRows: [] });
  const [query, setquery] = React.useState<string[]>([]);
  const [selectedCountryOption, setSelectedCountryOption] = React.useState<any>([]);
  const [filePreview, setFilePreview] = React.useState<FilePreviewType>({ isOpen: false, data: {} });
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [resultsLimit, setResultsLimit] = React.useState<any>("");

  const history = useHistory();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      query: [],
      resultsLimit: null,
      locations: [],
    },
  });

  const toast = useToast();

  // const [queryRequired, setqueryRequired] = useState(false)
  const onSubmit = async (data: any) => {
    // console.log("Form Data: 22", query.length);
    const locations = selectedCountryOption?.map((item: any) => { return item?.name })
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
        type: "manual",
        message: "Country is required",
      });
      return;
    }
    const payload = {
      // ...data,
      resultsLimit: Number(resultsLimit),
      query: query, locations, campaignId
    };
    // console.log("Form Data: ", payload, selectedCountryOption);
    try {
      setEmailLeads({ allRows: [] });
      setIsSubmitting(true);
      const response: any = await facebookScrapeLeadsData(payload);

      // console.log("response", response);

      if (response.status === 200) {
        const hasAllRows = Array.isArray(response.data?.allRows) && response.data?.allRows?.length > 0;
        const hasValidRows = Array.isArray(response.data?.validRows) && response.data?.validRows?.length > 0;

        if (!hasAllRows && !hasValidRows) {
          toast({
            title: `Data not found for the given query.`,
            status: "error",
            isClosable: true,
          });
        } else {
          if (subTab == "add-more-lead") {
            toast({
              title: `New Audience has been added successfully to the campaign`,
              status: "success",
              isClosable: true,
            });
          } else {
            toast({
              title: response.data?.message || `Data fetched successfully!`,
              status: "success",
              isClosable: true,
            });
          }
        }
        handleMergeLeads(response.data?.allRows || [], "facebookLeads");
        setEmailLeads(response.data);
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

  React.useEffect(() => {
    if (leadsForFacebook.length > 0) {
      setEmailLeads(leadsForFacebook);
    }
  }
    , [leadsForFacebook]);

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
    if (query.length === 0) {
      setError("query", { type: "manual", message: "Query is required" });
      return;
    } else {
      clearErrors("query");
    }
  };


  const removeTag = (index: number, type: "query" | "customDomains") => {
    if (type === "query") {
      setquery((prev) => prev.filter((_, i) => i !== index));
    }
  };



  return (
    <>
      <Box>
        <form>

          <FormControl isInvalid={!query.length && !!errors.query} mb={6}>
            <FormLabel htmlFor="query" display="flex" gap="4px" alignItems={"center"}>
              Query<small>(Type query and press Enter)</small>
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
              <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
            </FormLabel>
            <Input
              id="query"
              required
              disabled={disabled}
              placeholder="Type query and press Enter"
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
              <FormErrorMessage>Query are required</FormErrorMessage>}
          </FormControl>



          <FormControl isInvalid={!!errors.resultsLimit} mb={6}>
            <FormLabel htmlFor="limit">Limit  <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
            <Select
              width="auto"
              disabled={disabled}
              color="#6C757D"
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
            <FormErrorMessage>{errors?.resultsLimit?.message}</FormErrorMessage>
          </FormControl>


          <FormControl
            isInvalid={selectedCountryOption.length === 0 && !!errors.locations}
            mb={6}
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
              getOptionLabel={(option: any) => option.name}
              getOptionValue={(option: any) => option.name}
              placeholder="Select Country"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
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
                  backgroundColor: "#3182CE", // Same as Query tag
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
                  cursor: "pointer",
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

          <FormControl textAlign={'end'}>
            <Button
              disabled={disabled}
              colorScheme="blue"
              type="button"
              fontWeight="500"
              isLoading={isSubmitting}
              // disabled={isSubmitting} 
              // disabled={true}
              onClick={
                () => {
                  //  handleSubmit()
                  onSubmit({})
                }
              }
            >
              Submit Query
            </Button>
          </FormControl>
        </form>
        {emailLeads?.allRows?.length > 0 &&
          <Box my="24px">
            {/* <Text
              colorScheme="blue"
              onClick={() => { setFilePreview({ isOpen: true, data: emailLeads }) }}
            >
              Preview Data
            </Text> */}
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
                    ({emailLeads?.validPhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Valid Email: <Text as="span" color="green.500" fontWeight="semibold">
                    ({emailLeads?.validEmailCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Invalid Number: <Text as="span" color="red.500" fontWeight="semibold">
                    ({emailLeads?.invalidPhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Invalid Email: <Text as="span" color="red.500" fontWeight="semibold">
                    ({emailLeads?.invalidEmailCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Duplicate Number: <Text as="span" color="orange.400" fontWeight="semibold">
                    ({emailLeads?.duplicatePhoneCount || "0"})
                  </Text>
                </Text>
                <Text fontWeight={"400"} fontSize={"14px"}>
                  Duplicate Email: <Text as="span" color="orange.400" fontWeight="semibold">
                    ({emailLeads?.duplicateEmailCount || "0"})
                  </Text>
                </Text>
              </Flex>
            </Box>

          </Box>
        }

      </Box>
      <FileDataPreviewModal modalData={filePreview} onClose={() => { setFilePreview({ isOpen: false, data: {} }) }} />
    </>
  );
};

export default FacebookLeadsForDetailsCampaign;
