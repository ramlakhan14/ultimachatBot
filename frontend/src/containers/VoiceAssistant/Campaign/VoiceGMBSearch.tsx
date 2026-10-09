import React, { useEffect, useState } from "react";
import {
  Button,
  Text,
  Box,
  FormControl,
  Select,
  Input,
  FormLabel,
  Flex,
  InputGroup,
  Textarea,
  Switch,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  InputLeftElement,
  useToast,
  HStack,
  CloseButton,
  VStack,
  Tooltip,
} from "@chakra-ui/react";
import Multiselect from "multiselect-react-dropdown";
import { IoIosSearch } from "react-icons/io";
import { useForm } from "react-hook-form";
import categoriesData from "./categories.json";
import countriesData from "./countries.json";
import styles from "./VoiceGMBSearch.module.scss";
import { gmbScrapeAndSaveData } from "../../../services/VoiceBot";
import { Country, ICity, State, City } from "country-state-city";
import { callApi } from "../../../services/callApi";
import CustomProgressBar from "../../GlobalDashboard/CustomProgress";
import axios from "axios";
// import { getAllCities } from 'world-postalcodes';


// Your payload definition
interface FilterOption {
  id: string;
  label: string;
  key: string;
  operator: string;
  value: any;
  labelKey: string;
  exclusiveGroup?: string;
}

const filterOptions: FilterOption[] = [
  {
    id: "onlyWithWebsite",
    label: "Only with website",
    key: "site",
    operator: "is not blank",
    value: null,
    labelKey: "title.onlyWithWebsite",
    exclusiveGroup: "site_existence",
  },
  {
    id: "withPhone",
    label: "With Phone",
    key: "phone",
    operator: "is blank",
    value: null,
    labelKey: "title.withPhone",
  },
  {
    id: "verified",
    label: "Verified",
    key: "verified",
    operator: "is true",
    value: null,
    labelKey: "title.verified",
  },
];

const VoiceGMBSearch = ({ handleMergeLeads, disabled, CSVErrMsg, setParsedData, setCSVErrMsg }: any) => {
  const [selectedCatOptions, setSelectedCatOptions] = useState<any[]>([]);
  const [selectedCountryOption, setSelectedCountryOption] = useState<any | null>(null);

  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [showBusiness, setShowBusiness] = useState<boolean>(false);
  const [showVerified, setShowVerified] = useState<boolean>(false);
  const [showPhone, setShowPhone] = useState<boolean>(false);
  const [showRating, setShowRating] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [scrapedData, setScrapedData] = useState<{ email: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = React.useState<ICity[]>([]);
  const countries = Country.getAllCountries();
  const states = selectedCountry ? State.getStatesOfCountry(selectedCountry) : [];
  // const cities = selectedState ? City.getCitiesOfState(selectedCountry, selectedState) : [];
  const [quickFilters, setQuickFilters] = useState<any[]>([]);


  const getCitiesOfCountry = async (countryCode: string) => {
    try {
      const cities = await callApi(`/project/getPostalCode?country=${countryCode}`, 'get', "")
      // console.log(cities);
      return cities?.data
    } catch (error) {
      // console.error('Error fetching postal code:', error);
      // throw new Error('Failed to fetch postal code');
      return [];
    }

  };

  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm();

  const filteredEmails = scrapedData.filter((item: any) =>
    (item.phoneNumber?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );


  // const onSelectCatOptions = (selectedCatList: any) => {
  //   setSelectedCatOptions(selectedCatList);
  //   if (selectedCatList.length > 0) {
  //     clearErrors('categories');
  //   }
  // // };

  // const onRemoveCatOptions = (selectedCatList: any) => {
  //   setSelectedCatOptions(selectedCatList);
  //   if (selectedCatList.length === 0 && !showQuery) {
  //     setError('categories', { type: 'manual', message: 'Categories are required' });
  //   }
  // };

  const MAX_CATEGORIES = 5;

  const onSelectCatOptions = (selectedCatList: any) => {

    setSelectedCatOptions(selectedCatList);

    if (selectedCatList.length > 0) {
      clearErrors("categories");
    }
    if (selectedCatList.length >= MAX_CATEGORIES) {
      // toast.error("You can select a maximum of 5 categories.");
      toast({
        title: `You can select a maximum of 5 categories.`,
        status: "error",
        isClosable: true,
      });
      return;
    }
  };

  const onRemoveCatOptions = (selectedCatList: any) => {
    setSelectedCatOptions(selectedCatList);

    if (selectedCatList.length === 0 && !showQuery) {
      setError("categories", {
        type: "manual",
        message: "Categories are required",
      });
    } else {
      clearErrors("categories");
    }
  };


  const handleQueryToggle = (e: any) => {
    setShowQuery(e);
    if (e) {
      clearErrors('categories');
      clearErrors('country');
    }
  };

  const businessToggle = (e: any) => {
    setShowBusiness(e);
  };

  const verifiedToggle = (e: any) => {
    setShowVerified(e);
  };

  const phoneToggle = (e: any) => {
    setShowPhone(e);
  };

  const ratingToggle = (e: any) => {
    setShowRating(e);
  };

  const handleRatingValueChange = (e: any) => {
    const value = e.target.value;
    clearErrors('ratingValue');

    const values = value.split(',').map((value: any) => parseFloat(value.trim()));
    const isValid = values.every((value: any) => value >= 0.1 || isNaN(value));

    if (!isValid && value) {
      setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
    }
  };


  const [jobId, setJobId] = useState()

  const onSubmit = async (data: any) => {
    setCSVErrMsg(false);
    const values = data?.ratingValue?.split(',')?.map((value: any) => parseFloat(value.trim()));
    const isValid = values?.every((value: any) => value >= 0.1 || isNaN(value));
    // console.log("clicked>>>>>>>ad ");

    if (!isValid && data?.ratingValue) {
      setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
      return;
    }

    if (!showQuery) {
      if (selectedCatOptions.length === 0) {
        setError('categories', { type: 'manual', message: 'Categories are required' });
        return;
      }
      if (!selectedCountry) {
        setError('country', { type: 'manual', message: 'Country is required' });
        return;
      }

    }

    const {
      businessOperator,
      businessValue,
      verifiedOperator,
      verifiedValue,
      phoneOperator,
      phoneValue,
      ratingOperator,
      ratingValue,
      query,
      ...filteredData
    } = data;

    const formData = {
      ...filteredData,
    };

    if (!showQuery && selectedCatOptions && selectedCatOptions.length > 0) {
      formData.categories = selectedCatOptions.map((category: any) => category.name);
    }

    if (selectedCountry) {
      formData.country = selectedCountry.toLowerCase();
    }
    if (selectedCity) {
      formData.city = selectedCity.toLowerCase();
    }

    if (showQuery && query) {
      formData.query = query;
    }

    formData.filter = [...quickFilters];
    formData.limit = parseInt(formData?.limit);

    if (showBusiness && businessOperator && businessValue) {
      formData.filter.push({
        field: "business status",
        operator: businessOperator,
        value: businessValue,
      });
    }

    if (showVerified && verifiedOperator && verifiedValue) {
      formData.filter.push({
        field: "verified",
        operator: verifiedOperator,
        value: verifiedValue,
      });
    }

    if (showPhone && phoneOperator && phoneValue) {
      formData.filter.push({
        field: "phone",
        operator: phoneOperator,
        value: phoneValue,
      });
    }

    if (showRating && ratingOperator && ratingValue) {
      formData.filter.push({
        field: "rating",
        operator: ratingOperator,
        value: ratingValue,
      });
    }

    const finalData = {
      ...formData,
    };

    try {
      setIsSubmitting(true);
      const response: any = await gmbScrapeAndSaveData(finalData);
      if (response?.status === 201) {
        // console.log("Response from API:", response);
        setJobId(response.data?.data?.jobId)
        // if (response.data?.data?.length == 0) {
        //   toast({
        //     title: `Data not found for the given query.`,
        //     status: "error",
        //     isClosable: true,
        //   });
        // }
        // setScrapedData(response?.data?.data);

        // handleMergeLeads(response?.data?.data || [], "gmbLeads");
        // setIsSubmitting(false);
        // reset();
        // setSelectedCatOptions([]);
        // setSelectedCountryOption(null);
        toast({
          title: response?.data?.message,
          status: "success",
          isClosable: true,
        });
      } else {
        toast({
          title: response?.data?.message,
          status: "error",
          isClosable: true,
        });
      }


    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: error?.response?.data?.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  const delCampaignPhone = (phone: any) => {
    const updatedEmails = scrapedData.filter((phonenumber: any) => phonenumber.phoneNumber !== phone);
    setScrapedData(updatedEmails);
  }

  React.useEffect(() => {
    if (scrapedData.length > 0) {
      setParsedData(scrapedData);
    }
  }, [scrapedData]);


  const handleQuickFilters = (filterId: string) => {
    setQuickFilters((prev) => {
      const exists = prev.find((f) => f.id === filterId);
      if (exists) {
        // remove if already selected
        return prev.filter((f) => f.id !== filterId);
      } else {
        // add new filter from the payload
        const filterToAdd = filterOptions.find((f) => f.id === filterId);
        return filterToAdd ? [...prev, filterToAdd] : prev;
      }
    });
  };
  const handleRemoveFilter = (filterId: string) => {
    setQuickFilters((prev) => prev.filter((f) => f.id !== filterId));
  };


  const pollScrapeResult = (givenjobId: any) => {
    return axios.get(`/voicebot/scrape-result/${givenjobId}`);
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const response = await pollScrapeResult(jobId);
        // console.log("Polling response:", response.data);

        // Example: stop polling if job completed

        if (response.data?.data?.status === "FAILED") {
          // console.log("Polling response: FAILED", response.data);

          clearInterval(interval);
          toast({
            title: response.data?.data?.message || `Data not found for the given query.`,
            status: "error",
            isClosable: true,
          });
          setIsSubmitting(false);
        }
        if (response.data?.data?.status === "COMPLETED") {
          clearInterval(interval);

          const resultData = response?.data?.data?.result;
          const hasData = Array.isArray(resultData) ? resultData.length > 0 : Boolean(resultData && resultData != 0);

          if (!hasData) {
            toast({
              title: `Data not found for the given query.`,
              status: "error",
              isClosable: true,
            });
          } else {
            toast({
              title: `Data fetched successfully!`,
              status: "success",
              isClosable: true,
            });
          }
          setScrapedData(Array.isArray(resultData) ? resultData : []);
          handleMergeLeads(Array.isArray(resultData) ? resultData : [], "gmbLeads");
          setIsSubmitting(false);
        }


      } catch (error: any) {
        // console.error("Polling error:", error);
        setIsSubmitting(false);
        toast({
          title: error?.response?.data?.message,
          status: "error",
          isClosable: true,
        });
      }
    }, 5000);

    return () => clearInterval(interval); // cleanup
  }, [jobId]);


  return (
    <Box>
      <form onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      }}>

        <Box>
          <Box textAlign="start">
            <Text as="h4" fontSize="16px" fontWeight="600" color="#1A202C">GMB Leads</Text>
            <Text as="p" mt="4px" fontSize="14px" fontWeight="400" color="#6C757D">Please add target audience for this campaign by scraping new leads from the websites using GMB Search.</Text>
          </Box>
          <Text as="p" fontSize="16px" fontWeight="500" color="#212529" mt={'24px'} mb={'16px'}>Search GMB:</Text>

          <Box
            px="20px"
            py={'24px'}
            borderWidth="1px"
            borderColor="#EEF4FA"
            borderRadius="lg"
            boxShadow="sm"
            bg="white"
            w="100%"
            mb="24px"
          >
            {/* Quick Filters */}
            <Text fontWeight="semibold" mb="3">
              Quick Filter:
            </Text>

            <Box >
              <HStack spacing="3" wrap="wrap">
                {filterOptions.map((filter) => {
                  const isActive = quickFilters.some((f) => f.id === filter.id);
                  return (
                    <Button
                      key={filter.id}
                      disabled={disabled}
                      onClick={() => handleQuickFilters(filter.id)}
                      bg={isActive ? "#2977FF" : "#F8F9FA"}
                      color={isActive ? "white" : "#000000"}
                      _hover={{
                        bg: isActive ? "#2977FF" : "#E2E8F0",
                      }}
                      borderRadius="6px"
                      fontWeight="medium"
                      px={5}
                      py={2}
                      h="auto"
                      fontSize="sm"
                      boxShadow={isActive ? "md" : "none"}
                      transition="all 0.2s ease-in-out"
                    >
                      {filter.label}
                    </Button>
                  );
                })}
              </HStack>
              {/* Active Filters */}
              {quickFilters.length > 0 && (
                <>
                  <Text fontWeight="semibold" my="3">
                    Active Filters
                  </Text>

                  <VStack align="start" flexDirection={"row"} display={"flex"} alignItems={"center"} spacing={4} w="100%">
                    {quickFilters?.length > 1 && (
                      <VStack
                        spacing={0}
                        align="center"
                        justify="center"
                        position="relative"
                        h="80px"
                        minW="80px"
                      >
                        {/* Top line */}
                        <Box
                          position="absolute"
                          top="0"
                          left="50%"
                          transform="translateX(-50%)"
                          w="1px"
                          h="35%"
                          bg="gray.300"
                        />
                        <Box
                          position="absolute"
                          top="-13.5px"
                          left="53.2px"
                          transform="rotate(90deg)"
                          w="1px"
                          h="35%"
                          bg="gray.300"
                        />

                        {/* AND text */}
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="gray.500"
                          textAlign="center"
                          zIndex={1}
                        >
                          AND
                        </Text>

                        {/* Bottom line */}
                        <Box
                          position="absolute"
                          bottom="-13.5px"
                          left="53.2px"
                          transform="rotate(90deg)"
                          w="1px"
                          h="35%"
                          bg="gray.300"
                        />
                        <Box
                          position="absolute"
                          bottom="0"
                          left="50%"
                          transform="translateX(-50%)"
                          w="1px"
                          h="35%"
                          bg="gray.300"
                        />
                      </VStack>
                    )}
                    <Box mt={"0px!important"}>
                      {quickFilters.map((filter, index) => (
                        <HStack key={filter.id} spacing={3} marginTop={"0px!important"} align="center" w="100%">
                          <HStack
                            spacing={3}
                            p={3}
                            marginTop={"0px!important"}
                            flex="1"
                          >
                            {/* Field */}
                            <Select
                              size="sm"
                              value={filter.key}
                              w="150px"
                              onChange={(e) => {
                                const newKey = e.target.value;
                                setQuickFilters((prev) =>
                                  prev.map((f) =>
                                    f.id === filter.id ? { ...f, key: newKey } : f
                                  )
                                );
                              }}
                            >
                              <option value="site">Site</option>
                              <option value="phone">Phone</option>
                              <option value="verified">Verified</option>
                            </Select>

                            {/* Operator */}
                            <Select
                              size="sm"
                              value={filter.operator}
                              w="150px"
                              onChange={(e) => {
                                const newOperator = e.target.value;
                                setQuickFilters((prev) =>
                                  prev.map((f) =>
                                    f.id === filter.id
                                      ? { ...f, operator: newOperator }
                                      : f
                                  )
                                );
                              }}
                            >
                              <option value="is blank">Is blank</option>
                              <option value="is not blank">Is not blank</option>
                              <option value="equals">Equals</option>
                              <option value="is true">Is true</option>
                              <option value="is false">Is false</option>
                            </Select>

                            {/* Remove */}
                            <CloseButton
                              aria-label="Remove Filter"
                              // icon={<CloseButton size="16px" width={"16px"} height={"16px"} fontSize={"16px"} />}
                              size="sm"
                              fontSize={"10px"}
                              variant="ghost"
                              color="gray.500"
                              _hover={{ color: "red.500" }}
                              onClick={() => handleRemoveFilter(filter.id)}
                            />
                          </HStack>
                        </HStack>
                      ))}
                    </Box>

                  </VStack>
                </>
              )}
            </Box>

          </Box>
          <FormControl mb={"-20px"}>
            <Flex w="100%" alignItems="center" justifyContent={"flex-end"}>
              <FormLabel fontWeight="400" fontSize="14px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                Plain queries
              </FormLabel>
              <Switch
                defaultChecked={showQuery}
                disabled={disabled}
                onChange={(event) => { handleQueryToggle(event.target.checked) }}
                colorScheme="blue"
                size="lg"
                outline={"none"}
                mr="2"
              />
            </Flex>
          </FormControl>
          <Box alignItems="center">
            {!showQuery && <Box mb={"15px"}>
              <Text mb={'8px'} marginRight="8px" fontSize={'14px'} color={'#212529'}>
                Categories <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
              </Text>
              <Multiselect
                style={{ marginTop: "15px" }}
                selectionLimit={5}
                disable={disabled}
                options={categoriesData || []}
                onSelect={onSelectCatOptions}
                onRemove={onRemoveCatOptions}
                displayValue="name"
                closeIcon="cancel"
                placeholder="Select Options"
                selectedValues={selectedCatOptions}
                className="multiSelectContainer"
              />
              {errors.categories && <p style={{ color: 'red', fontSize: '12px' }}>{errors.categories.message}</p>}
            </Box>}
            {showQuery && <Box mb={"15px"}>
              <Text mb={'8px'} marginRight="8px">
                Queries (category + city + country)
              </Text>
              <InputGroup
                borderRadius="4px"
                borderColor="#6C757D"
                marginRight="8px"
              >
                <Textarea
                  id="query"
                  placeholder="Real estate agency, Rome, Italy
Doctor, London, UK
Restaurant, New York, US
(Press Enter to add a new line)"
                  color="#6C757D"
                  rows={5}
                  {...register('query', { required: 'Search query is required' })}
                />
              </InputGroup>
              {errors.query && <p style={{ color: 'red', fontSize: '12px' }}>{errors.query.message}</p>}
            </Box>}
            <Flex gap={5} wrap="wrap">
              {/* Country Dropdown */}
              <Box w="32%">
                <Text mb={'8px'} fontSize={'14px'} color={'#212529'}>Country <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></Text>
                <Select
                  placeholder="Select Country"
                  disabled={disabled}
                  value={selectedCountry}
                  {...register("country", { required: "Country is required" })}
                  onChange={async (e) => {
                    const value = e.target.value;

                    setSelectedCountry(value);
                    clearErrors("country"); // ✅ clear error
                    // onChange={async (e) => {
                    //   setSelectedCountry(e.target.value);
                    const allcity: any = await getCitiesOfCountry(e.target.value)
                    // console.log("allcity", allcity);
                    setCities(allcity)
                    setSelectedState("");
                    setSelectedCity("");
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </option>
                  ))}
                </Select>
                {errors.country && <p style={{ color: 'red', fontSize: '12px' }}>{errors.country.message}</p>}

              </Box>


              {/* State Dropdown */}
              {/* <Box w="30%">
                <Text mb={2}>State</Text>
                <Select
                  placeholder="Select State"
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity("");
                  }}
                  isDisabled={!selectedCountry}
                >
                  {states.map((state) => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name}
                    </option>
                  ))}
                </Select>
              </Box> */}

              {/* City Dropdown */}
              <Box w="32%">
                <Text mb={'8px'} fontSize={'14px'} color={'#212529'}>City
                  {/* <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text> */}
                </Text>
                <Select
                  placeholder="Select City"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  isDisabled={!selectedCountry}
                >
                  {
                    cities?.length > 0 ? <>
                      {cities?.map((city: any, index: any) => (
                        <option key={index} value={city}>
                          {city}
                        </option>
                      ))}
                    </> :
                      <option>City not available</option>
                  }
                </Select>
              </Box>
              <Box mb={"15px"} w={"32%"}>
                <Text mb={'8px'} fontSize={'14px'} color={'#212529'} >
                  Limits <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                </Text>
                <Select
                  width="auto"
                  disabled={disabled}
                  color="#000"
                  {...register('limit', { required: 'Limit is required' })}
                >
                  <option value={''}>Select Limit</option>
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                  <option value={250}>250</option>
                  <option value={300}>300</option>
                  <option value={350}>350</option>
                  <option value={400}>400</option>
                  <option value={450}>450</option>
                  <option value={500}>500</option>
                </Select>
                {errors.limit && <p style={{ color: 'red', fontSize: '12px' }}>{errors.limit.message}</p>}
              </Box>

            </Flex>
            <Flex gap={2}>
              {/* <Box mb={"15px"} w={"50%"}>
                <Text as="span" marginRight="8px">
                  Country
                </Text>
                <Multiselect
                  options={countriesData || []}
                  selectedValues={selectedCountryOption ? [selectedCountryOption] : []}
                  onSelect={handleCountrySelect}
                  onRemove={handleCountryRemove}
                  displayValue={"name"}
                  showCheckbox={false}
                  placeholder="Select an option"
                />
                {errors.country && <p style={{ color: 'red', fontSize: '12px' }}>{errors.country.message}</p>}
              </Box> */}
              {/* <Box mb={"15px"} w={"50%"}>
                <Text as="span" marginRight="8px">
                  Limits
                </Text>
                <Select
                  width="auto"
                  color="#6C757D"
                  {...register('limit', { required: 'Limit is required' })}
                >
                  <option value={''}>Select Limit</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                  <option value={250}>250</option>
                  <option value={300}>300</option>
                  <option value={350}>350</option>
                  <option value={400}>400</option>
                  <option value={450}>450</option>
                  <option value={500}>500</option>
                </Select>
                {errors.limit && <p style={{ color: 'red', fontSize: '12px' }}>{errors.limit.message}</p>}
              </Box> */}
            </Flex>
            <Box mb={"15px"}>
              <Text fontWeight={500} marginRight="8px" mt={3} mb="10px">
                Advanced parameters
              </Text>
              <Box mb={"15px"}>
                <FormControl mb={"0px"}>
                  <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                    <FormLabel fontWeight="400" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                      Business Status
                    </FormLabel>
                    <Switch
                      disabled={disabled}
                      defaultChecked={false}
                      onChange={(event) => { businessToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
                      mr="2"
                    />
                  </Flex>
                </FormControl>
                {showBusiness && <Box p={"10px"} mb={"15px"}>
                  <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                    <Box w="50%">
                      <Text as="span" fontSize={"14px"} marginRight="8px">
                        Operator
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('businessOperator', { required: 'Operator is required' })}
                      >
                        <option value={'Equals'}>Equals</option>
                      </Select>
                      {errors.businessOperator && <p style={{ color: 'red', fontSize: '12px' }}>{errors.businessOperator.message}</p>}
                    </Box>
                    <Box w="50%">
                      <Text as="span" fontSize={"14px"} marginRight="8px">
                        Values (one of)
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('businessValue', { required: 'Value is required' })}
                      >
                        <option value={''}>Select Value</option>
                        <option value={'operational'}>Operational</option>
                        <option value={'closed_temporarily'}>Closed Temporarily</option>
                        <option value={'closed_permanently'}>Closed Permanently</option>
                      </Select>
                      {errors.businessValue && <p style={{ color: 'red', fontSize: '12px' }}>{errors.businessValue.message}</p>}
                    </Box>
                  </Flex>
                </Box>}
              </Box>
              <Box mb={"15px"}>
                <FormControl mb={"0px"}>
                  <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                    <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                      Verified
                    </FormLabel>
                    <Switch
                      disabled={disabled}
                      defaultChecked={false}
                      onChange={(event) => { verifiedToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
                      mr="2"
                    />
                  </Flex>
                </FormControl>
                {showVerified && <Box p={"10px"} mb={"15px"}>
                  <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Operator
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('verifiedOperator', { required: 'Operator is required' })}
                      >
                        <option value={'Equals'}>Equals</option>
                      </Select>
                      {errors.verifiedOperator && <p style={{ color: 'red', fontSize: '12px' }}>{errors.verifiedOperator.message}</p>}
                    </Box>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Values (one of)
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('verifiedValue', { required: 'Value is required' })}
                      >
                        <option value={''}>Select Value</option>
                        <option value={'true'}>True</option>
                        <option value={'false'}>False</option>
                      </Select>
                      {errors.verifiedValue && <p style={{ color: 'red', fontSize: '12px' }}>{errors.verifiedValue.message}</p>}
                    </Box>
                  </Flex>
                </Box>}
              </Box>
              <Box mb={"15px"}>
                <FormControl mb={"0px"}>
                  <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                    <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                      Phone
                    </FormLabel>
                    <Switch
                      disabled={disabled}
                      defaultChecked={false}
                      onChange={(event) => { phoneToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
                      mr="2"
                    />
                  </Flex>
                </FormControl>
                {showPhone && <Box p={"10px"} mb={"15px"}>
                  <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Operator
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('phoneOperator', { required: 'Operator is required' })}
                      >
                        <option value={'Equals'}>Equals</option>
                      </Select>
                      {errors.phoneOperator && <p style={{ color: 'red', fontSize: '12px' }}>{errors.phoneOperator.message}</p>}
                    </Box>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Values (one of)
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('phoneValue', { required: 'Value is required' })}
                      >
                        <option value={''}>Select Value</option>
                        <option value={'id_not_blank'}>Is not blank</option>
                        <option value={'is_blank'}>Is blank</option>
                      </Select>
                      {errors.phoneValue && <p style={{ color: 'red', fontSize: '12px' }}>{errors.phoneValue.message}</p>}
                    </Box>
                  </Flex>
                </Box>}
              </Box>
              <Box mb={"15px"}>
                <FormControl mb={"0px"}>
                  <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                    <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                      Rating
                    </FormLabel>
                    <Switch
                      defaultChecked={false}
                      disabled={disabled}
                      onChange={(event) => { ratingToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
                      mr="2"
                    />
                  </Flex>
                </FormControl>
                {showRating && <Box p={"10px"} mb={"15px"}>
                  <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Operator
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        {...register('ratingOperator', { required: 'Operator is required' })}
                      >
                        <option value={''}>Select Operator</option>
                        <option value={'Contains_One_Of'}>Contains One Of</option>
                        <option value={'Contains_None_Of'}>Contains None Of</option>
                        <option value={'Starts_With'}>starts with</option>
                        <option value={'Equals'}>Equals</option>
                      </Select>
                      {errors.ratingOperator && <p style={{ color: 'red', fontSize: '12px' }}>{errors.ratingOperator.message}</p>}
                    </Box>
                    <Box w="50%">
                      <Text as="span" fontSize="14px" marginRight="8px">
                        Values
                      </Text>
                      <InputGroup
                        borderRadius="4px"
                        borderColor="#6C757D"
                        marginRight="8px"
                      >
                        <Input
                          type="text"
                          placeholder="4.1, 3.6, 5.5 etc."
                          color="#6C757D"
                          size="md"
                          {...register('ratingValue', { required: 'Value is required' })}
                          onChange={handleRatingValueChange}
                        />
                      </InputGroup>
                      {errors.ratingValue && <p style={{ color: 'red', fontSize: '12px' }}>{errors.ratingValue.message}</p>}
                    </Box>
                  </Flex>
                </Box>}
              </Box>
            </Box>
          </Box>
        </Box>
        {CSVErrMsg && !errors.csvFile && <Text color="#e53e3e" fontSize={'14px'}>No valid rows exists for this campaign.</Text>}
        <Box mt="40px">
          {
            isSubmitting &&
            <Box maxW={"100%"} mb="10px">
              <CustomProgressBar loading={isSubmitting} />
            </Box>
          }
          <Flex justifyContent="flex-end">
            {/* <Button bg="#6C757D" color="#FFFFFF" mr={3}
              onClick={() => { }}
              fontSize="16px" fontWeight="400" className={styles.cancaleBtn} >
              Cancel
            </Button> */}
            <Button type="button"
              colorScheme="blue"
              onClick={handleSubmit(onSubmit)} fontSize="16px" fontWeight="500" isLoading={isSubmitting}
              disabled={disabled || isSubmitting}>
              <Text as="span" ms="8px">
                Fetch Records
              </Text>
            </Button>
          </Flex>
        </Box>
      </form>

      {scrapedData.length > 0 && (
        <>
          <Box>
            <Box textAlign="right" mt={4} mb={4}>
              <Flex justifyContent="end">
                <InputGroup
                  width="300px"
                  borderRadius="4px"
                  outline="none"
                  borderColor="#6C757D"
                >
                  <InputLeftElement pointerEvents='none'>
                    <IoIosSearch color="#CED4DA" />
                  </InputLeftElement>
                  <Input
                    outline="none"
                    border="1px solid #CED4DA!important"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </InputGroup>
              </Flex>
            </Box>
            <Text as="div" style={{ minWidth: "100%", width: "600px" }}>
              <TableContainer
                overflow="auto"
                // width="100%"
                // maxW="100%"
                maxHeight={'400px'}
                overflowY={'auto'}
                borderRadius="8px"
                boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
                <Table variant="simple" minW="600px">
                  <Thead bg={"#EAF1FF"}>
                    <Tr>
                      <Th>#</Th>
                      <Th>Phone</Th>
                      <Th>Email</Th>
                      <Th>Company Name</Th>
                      <Th>Website URL</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredEmails.length > 0 ? (
                      filteredEmails.map((data: any, index: number) => (
                        <Tr key={index}>
                          <Td>{index + 1}</Td>
                          <Td>{data?.phoneNumber}</Td>
                          <Td>{data?.email}</Td>
                          <Td> <Box display="flex" maxW={"300px"} alignItems="center" gap="6px">
                            {data?.companyName ? <>
                              <Tooltip label={data.companyName}>
                                <Text isTruncated flex="1">{data.companyName}</Text>
                              </Tooltip>
                            </>
                              :
                              <Text color="#888888">N/A</Text>
                            }
                          </Box></Td>
                          <Td>
                            <Box display="flex" maxW={"200px"} alignItems="center" gap="6px">
                              <Tooltip label={data.websiteUrl}>
                                <Text isTruncated flex="1">{data.websiteUrl}</Text>
                              </Tooltip>
                            </Box>
                          </Td>
                          <Td>
                            <Button
                              size="sm"
                              fontSize={12}
                              variant="outline"
                              borderColor="transparent"
                              onClick={() =>
                                delCampaignPhone(data?.phoneNumber)
                              }
                              mr={2}
                              sx={{
                                _focus: {
                                  boxShadow: "none",
                                },
                              }}
                            >
                              <svg
                                width="14"
                                height="16"
                                viewBox="0 0 14 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
                                  fill="#DC3545"
                                />
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
                                  fill="#DC3545"
                                />
                              </svg>
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={4} textAlign="center">No data available</Td>
                      </Tr>
                    )}
                    {scrapedData.length > 0 && scrapedData.length === 0 && (
                      scrapedData.map((data: any, index: number) => (
                        <Tr key={data?._id}>
                          <Td> {index + 1}</Td>
                          <Td>{data?.phoneNumber}</Td>
                          <Td>{data?.email}</Td>
                          <Td>{data?.companyName}</Td>
                          <Td>{data?.websiteUrl}</Td>
                          <Td>
                            <Button
                              size="sm"
                              fontSize={12}
                              variant="outline"
                              borderColor="transparent"
                              onClick={() => {
                                delCampaignPhone(data?.phoneNumber);
                              }}
                              mr={2}

                              sx={{
                                _focus: {
                                  boxShadow: 'none',  // Removes the focus box shadow
                                }
                              }}
                            >
                              <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                              </svg>
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )
                    }
                  </Tbody>
                </Table>
              </TableContainer>
            </Text>
          </Box>
        </>)}
    </Box>
  )
}

export default VoiceGMBSearch;