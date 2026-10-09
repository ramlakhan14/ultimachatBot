import React, { useEffect, useState, useRef } from "react";
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
import styles from "./VoiceGMBSearch.module.scss";
import { yellowPagesScrapeAndSaveData, getYellowPagesScrapeResult } from "../../../services/YellowPages/yellowPagesService";
import { Country, ICity } from "country-state-city";
import { callApi } from "../../../services/callApi";
import CustomProgressBar from "../../GlobalDashboard/CustomProgress";

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
    id: "withPhone",
    label: "With Phone",
    key: "phone",
    operator: "is blank",
    value: null,
    labelKey: "title.withPhone",
  },
];

const VoiceYellowPages = ({ handleMergeLeads, disabled, CSVErrMsg, setParsedData, setCSVErrMsg }: any) => {
  const [selectedCatOptions, setSelectedCatOptions] = useState<any[]>([]);
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [showPhone, setShowPhone] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [scrapedData, setScrapedData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<ICity[]>([]);
  const countries = Country.getAllCountries();
  const [quickFilters, setQuickFilters] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollCountRef = useRef(0);

  const toast = useToast();

  const getCitiesOfCountry = async (countryCode: string) => {
    try {
      const response = await callApi(`/project/getPostalCode?country=${countryCode}`, 'get', "");
      return response?.data;
    } catch (error) {
      return [];
    }
  };

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm();

  const filteredData = scrapedData.filter((item: any) =>
    (item.phoneNumber?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
    (item.email?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
    (item.businessName?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
    (item.companyName?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );

  const MAX_CATEGORIES = 5;

  const onSelectCatOptions = (selectedCatList: any) => {
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length > 0) {
      clearErrors("categories");
    }
    if (selectedCatList.length >= MAX_CATEGORIES) {
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

  const handleQueryToggle = (e: boolean) => {
    setShowQuery(e);
    if (e) {
      clearErrors('categories');
      clearErrors('country');
    }
  };

  const phoneToggle = (e: boolean) => {
    setShowPhone(e);
  };

  const onSubmit = async (data: any) => {
    setCSVErrMsg(false);

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
      phoneOperator,
      phoneValue,
      query,
      ...filteredFormData
    } = data;

    const formData: any = {
      ...filteredFormData,
    };

    const countryObj = countries.find((c) => c.isoCode === selectedCountry);
    const countryName = countryObj ? countryObj.name : selectedCountry;
    const locationStr = selectedCity ? `${selectedCity}, ${countryName}` : countryName;

    const ypPayload: any = {
      query: showQuery ? data.query : selectedCatOptions.map((c: any) => c.name).join(", "),
      location: locationStr,
      limit: Number(data.limit) || 20,
      filter: [...quickFilters],
    };

    if (showPhone && phoneOperator && phoneValue) {
      ypPayload.filter.push({
        field: "phone",
        operator: phoneOperator,
        value: phoneValue,
      });
    }

    try {
      setIsSubmitting(true);
      const response: any = await yellowPagesScrapeAndSaveData(ypPayload);
      const apiMsg = response?.message || response?.data?.message || response?.data?.data?.message;
      if (apiMsg) {
        toast.closeAll();
        toast({
          title: apiMsg,
          status: "success",
          isClosable: true,
        });
      }
      const jId = response?.data?.jobId || response?.data?.data?.jobId || response?.jobId;
      if (jId) {
        setJobId(jId);
      } else {
        setIsSubmitting(false);
        if (!apiMsg) {
          toast.closeAll();
          toast({
            title: "Failed to initiate YELLOWPAGES scrape.",
            status: "error",
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      setIsSubmitting(false);
      toast.closeAll();
      toast({
        title: error?.response?.data?.message || error?.message || "Error initiating YELLOWPAGES scrape.",
        status: "error",
        isClosable: true,
      });
    }
  };

  const delCampaignPhone = (phone: any) => {
    const updated = scrapedData.filter((item: any) => item.phoneNumber !== phone);
    setScrapedData(updated);
    handleMergeLeads(updated, "yellowpagesLeads");
  };

  useEffect(() => {
    if (scrapedData.length > 0) {
      setParsedData(scrapedData);
    }
  }, [scrapedData]);

  const handleQuickFilters = (filterId: string) => {
    setQuickFilters((prev) => {
      const exists = prev.find((f) => f.id === filterId);
      if (exists) {
        return prev.filter((f) => f.id !== filterId);
      } else {
        const filterToAdd = filterOptions.find((f) => f.id === filterId);
        return filterToAdd ? [...prev, filterToAdd] : prev;
      }
    });
  };

  const handleRemoveFilter = (filterId: string) => {
    setQuickFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  useEffect(() => {
    if (!jobId) return;

    pollCountRef.current = 0;

    const interval = setInterval(async () => {
      try {
        pollCountRef.current += 1;

        // 8 minute timeout check (96 attempts * 5 seconds = 480 seconds)
        if (pollCountRef.current >= 96) {
          clearInterval(interval);
          setIsSubmitting(false);
          setJobId(null);
          toast({
            title: "Scraping timed out after 8 minutes. Please try again.",
            status: "error",
            isClosable: true,
          });
          return;
        }

        const response: any = await getYellowPagesScrapeResult(jobId);
        const resData = response?.data?.data || response?.data || {};
        const status = resData?.status;

        if (status === "FAILED") {
          clearInterval(interval);
          setIsSubmitting(false);
          setJobId(null);
          toast.closeAll();
          toast({
            title: resData?.message || resData?.error || "Scrape failed for YELLOWPAGES",
            status: "error",
            isClosable: true,
          });
        } else if (status === "COMPLETED") {
          clearInterval(interval);
          setIsSubmitting(false);
          setJobId(null);

          const resultObj = resData?.result || {};
          const resultData =
            resultObj.allRows ||
            resultObj.validRows ||
            resultObj.audiences ||
            resultObj.data ||
            resData.uniqueScrapData ||
            [];

          const finalRows = Array.isArray(resultData) ? resultData : [];
          const count = finalRows.length;

          if (count > 0) {
            setScrapedData(finalRows);
            handleMergeLeads(finalRows, "yellowpagesLeads");
            toast.closeAll();
            toast({
              title: `YELLOWPAGES scraping completed (${count} rows found).`,
              status: "success",
              isClosable: true,
            });
          } else {
            toast.closeAll();
            toast({
              title: `No data found for YELLOWPAGES query.`,
              status: "error",
              isClosable: true,
            });
          }
        }
      } catch (error: any) {
        // ignore transient network errors during polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <Box pointerEvents={disabled ? "none" : "auto"} opacity={disabled ? 0.6 : 1}>
      <Box>
        <Box textAlign="start">
          <Text as="p" fontSize="16px" fontWeight="600" color="#1A202C" pb="8px">
            Yellow Pages Scrape
          </Text>
          <Text as="p" fontSize="14px" fontWeight="400" color="#6C757D" pb="24px">
            Scrape business listings from Yellow Pages by using queries and locations below:
          </Text>
        </Box>

        <Box p="5" borderWidth="1px" borderColor="#EEF4FA" borderRadius="lg" boxShadow="sm" bg="white" w="100%" mb="24px">
          <Text fontWeight="semibold" mb="3">
            Quick Filter:
          </Text>

          <Box>
            <HStack spacing="3" wrap="wrap">
              {filterOptions
                .filter((f) => f.id === "withPhone")
                .map((filter) => {
                  const isActive = quickFilters.some((f) => f.id === filter.id);
                  return (
                    <Button
                      key={filter.id}
                      onClick={() => handleQuickFilters(filter.id)}
                      bg={isActive ? "#2977FF" : "#F8F9FA"}
                      color={isActive ? "white" : "#000000"}
                      _hover={{ bg: isActive ? "#2977FF" : "#E2E8F0" }}
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

            {quickFilters.length > 0 && (
              <>
                <Text fontWeight="semibold" my="3">
                  Active Filters
                </Text>

                <VStack align="start" flexDirection={"row"} display={"flex"} alignItems={"center"} spacing={4} w="100%">
                  <Box mt={"0px!important"}>
                    {quickFilters.map((filter) => (
                      <HStack key={filter.id} spacing={3} marginTop={"0px!important"} align="center" w="100%">
                        <HStack spacing={3} p={3} marginTop={"0px!important"} flex="1">
                          <Select
                            size="sm"
                            value={filter.key}
                            w="150px"
                            onChange={(e) => {
                              const newKey = e.target.value;
                              setQuickFilters((prev) =>
                                prev.map((f) => (f.id === filter.id ? { ...f, key: newKey } : f))
                              );
                            }}
                          >
                            <option value="phone">Phone</option>
                          </Select>

                          <Select
                            size="sm"
                            value={filter.operator}
                            w="150px"
                            onChange={(e) => {
                              const newOperator = e.target.value;
                              setQuickFilters((prev) =>
                                prev.map((f) => (f.id === filter.id ? { ...f, operator: newOperator } : f))
                              );
                            }}
                          >
                            <option value="is blank">Is blank</option>
                            <option value="is not blank">Is not blank</option>
                            <option value="equals">Equals</option>
                          </Select>

                          <CloseButton
                            aria-label="Remove Filter"
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
              isChecked={showQuery}
              disabled={disabled}
              onChange={(event) => { handleQueryToggle(event.target.checked); }}
              colorScheme="blue"
              size="lg"
              outline={"none"}
              mr="2"
            />
          </Flex>
        </FormControl>

        <Box alignItems="center">
          {!showQuery && (
            <Box mb={"15px"}>
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
              {errors.categories && <p style={{ color: 'red', fontSize: '12px' }}>{errors.categories.message as string}</p>}
            </Box>
          )}

          {showQuery && (
            <Box mb={"15px"}>
              <Text mb={'8px'} marginRight="8px">
                Queries (category + city + country)
              </Text>
              <InputGroup borderRadius="4px" marginRight="8px">
                <Textarea
                  id="query"
                  disabled={disabled}
                  placeholder={`Real estate agency, Rome, Italy\nDoctor, London, UK\nRestaurant, New York, US\n(Press Enter to add a new line)`}
                  color="#6C757D"
                  rows={5}
                  {...register('query', { required: 'Search query is required' })}
                />
              </InputGroup>
              {errors.query && <p style={{ color: 'red', fontSize: '12px' }}>{errors.query.message as string}</p>}
            </Box>
          )}

          <Flex gap={3} w="100%" alignItems="center">
            <Box flex={1}>
              <Text mb={'8px'} marginRight="8px" fontSize={'14px'} color={'#212529'}>
                Country <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
              </Text>
              <Select
                placeholder="Select Country"
                value={selectedCountry}
                disabled={disabled}
                {...register("country", { required: "Country is required" })}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSelectedCountry(val);
                  clearErrors("country");
                  const allcity: any = await getCitiesOfCountry(val);
                  setCities(allcity);
                  setSelectedCity("");
                }}
              >
                {countries.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </Select>
              {errors.country && <p style={{ color: 'red', fontSize: '12px' }}>{errors.country.message as string}</p>}
            </Box>

            <Box flex={1}>
              <Text mb={'8px'} marginRight="8px" fontSize={'14px'} color={'#212529'}>
                City
              </Text>
              <Select
                placeholder="Select City"
                value={selectedCity}
                disabled={disabled || !selectedCountry}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                {cities?.length > 0 ? (
                  cities.map((city: any, index: number) => (
                    <option key={index} value={typeof city === 'string' ? city : city.name}>
                      {typeof city === 'string' ? city : city.name}
                    </option>
                  ))
                ) : (
                  <option value="">City not available</option>
                )}
              </Select>
            </Box>

            <Box flex={1}>
              <Text mb={'8px'} marginRight="8px" fontSize={'14px'} color={'#212529'}>
                Limits <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
              </Text>
              <Select
                width="100%"
                disabled={disabled}
                color="#000000!important"
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
              {errors.limit && <p style={{ color: 'red', fontSize: '12px' }}>{errors.limit.message as string}</p>}
            </Box>
          </Flex>

          <Box mb={"15px"}>
            <Text fontWeight={500} marginRight="8px" mt={3} mb="10px">
              Advanced parameters
            </Text>

            <Box mb={"15px"}>
              <FormControl mb={"0px"}>
                <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                  <FormLabel fontWeight="400" fontSize="14px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                    Phone
                  </FormLabel>
                  <Switch
                    isChecked={showPhone}
                    disabled={disabled}
                    onChange={(event) => { phoneToggle(event.target.checked); }}
                    colorScheme="blue"
                    size="lg"
                    outline={"none"}
                  />
                </Flex>
              </FormControl>
              {showPhone && (
                <Box p={"10px"} mb={"15px"}>
                  <Flex w="100%" alignItems="center" gap={2} justifyContent={"space-between"}>
                    <Box w="50%">
                      <Text as="span" fontSize={'14px'} color={'#212529'} marginRight="8px">
                        Operator
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        disabled={disabled}
                        {...register('phoneOperator', { required: 'Operator is required' })}
                      >
                        <option value={'Equals'}>Equals</option>
                      </Select>
                      {errors.phoneOperator && <p style={{ color: 'red', fontSize: '12px' }}>{errors.phoneOperator.message as string}</p>}
                    </Box>
                    <Box w="50%">
                      <Text as="span" fontSize={'14px'} color={'#212529'} marginRight="8px">
                        Values (one of)
                      </Text>
                      <Select
                        width="auto"
                        color="#6C757D"
                        disabled={disabled}
                        {...register('phoneValue', { required: 'Value is required' })}
                      >
                        <option value={''}>Select Value</option>
                        <option value={'id_not_blank'}>Is not blank</option>
                        <option value={'is_blank'}>Is blank</option>
                      </Select>
                      {errors.phoneValue && <p style={{ color: 'red', fontSize: '12px' }}>{errors.phoneValue.message as string}</p>}
                    </Box>
                  </Flex>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box mt="40px">
          {isSubmitting && (
            <Box maxW={"100%"} mb="10px">
              <CustomProgressBar loading={isSubmitting} />
            </Box>
          )}
          <Flex justifyContent="flex-end">
            <Button
              type="button"
              colorScheme="blue"
              onClick={handleSubmit(onSubmit)}
              fontSize="16px"
              fontWeight="500"
              isLoading={isSubmitting}
              disabled={disabled || isSubmitting}
            >
              <Text as="span" ms="8px">
                Fetch Records
              </Text>
            </Button>
          </Flex>
        </Box>
      </Box>

      {scrapedData?.length > 0 && (
        <Box mt={5}>
          <Flex justifyContent="space-between" alignItems="center" mb={3}>
            <Text fontWeight="600" fontSize="16px">
              Scraped Records ({scrapedData.length})
            </Text>
            <InputGroup width="250px" borderRadius="4px" borderColor="#CED4DA">
              <InputLeftElement pointerEvents="none" height="30px">
                <IoIosSearch color="#6C757D" />
              </InputLeftElement>
              <Input
                placeholder="Search phone number"
                border="1px solid #CED4DA!important"
                size="sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Flex>

          <TableContainer overflowY="auto" maxH="350px" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
            <Table variant="simple" size="sm">
              <Thead bg="#F8F9FA" position="sticky" top={0} zIndex={1}>
                <Tr>
                  <Th>#</Th>
                  <Th>Email ID</Th>
                  <Th>Website / Business</Th>
                  <Th>Phone Number</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredData?.map((data: any, index: number) => (
                  <Tr key={index}>
                    <Td>{index + 1}</Td>
                    <Td>{data?.email || "NA"}</Td>
                    <Td cursor={"pointer"}>
                      <Tooltip label={data?.businessName || data?.companyName || data?.websiteUrl || "NA"} fontSize="11px">
                        {(data?.businessName || data?.companyName || data?.websiteUrl)
                          ? (data?.businessName || data?.companyName || data?.websiteUrl)?.substring(0, 25)
                          : "NA"}
                      </Tooltip>
                    </Td>
                    <Td>{data?.phoneNumber || data?.phone || "NA"}</Td>
                    <Td>
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="transparent"
                        onClick={() => delCampaignPhone(data?.phoneNumber || data?.phone)}
                      >
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.9992 7 12.9992C6.86739 12.9992 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.9992 9.5 12.9992C9.63261 12.9992 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z" fill="#DC3545" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z" fill="#DC3545" />
                        </svg>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default VoiceYellowPages;
