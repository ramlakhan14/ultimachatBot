import React, { useState } from "react";
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
  useToast,
} from "@chakra-ui/react";
import Multiselect from "multiselect-react-dropdown";
import { useForm } from "react-hook-form";
import categoriesData from "./categories.json";
import countriesData from "./countries.json";
import { Country, ICity, State, City } from "country-state-city";
import styles from "./ScrapeLeads.module.scss";
import { gmbScrapeLeadsData } from "../../services/UltimaReviewsConnection";
import { callApi } from "../../services/callApi";

const ScrapeLeads = ({ emailLeads, setEmailLeads }: any) => {
  const [selectedCatOptions, setSelectedCatOptions] = useState<any[]>([]);
  const [selectedCountryOption, setSelectedCountryOption] = useState<any | null>(null);

  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [showBusiness, setShowBusiness] = useState<boolean>(false);
  const [showVerified, setShowVerified] = useState<boolean>(false);
  const [showPhone, setShowPhone] = useState<boolean>(false);
  const [showRating, setShowRating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = React.useState<ICity[]>([]);
  const [quickFilters, setQuickFilters] = useState<any[]>([]);

  // const [cities, setCities] = React.useState<ICity[]>([]);
  const countries = Country.getAllCountries();


  const getCitiesOfCountry = async (countryCode: string) => {
    try {
      const cities = await callApi(`/project/getPostalCode?country=${countryCode}`, 'get', "");
      return cities?.data
    } catch (error) {
      // console.error('Error fetching postal code:', error);
      // throw new Error('Failed to fetch postal code');
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

  const toast = useToast();


  const onSelectCatOptions = (selectedCatList: any) => {
    setSelectedCatOptions(selectedCatList);
    if (selectedCatList.length > 0) {
      clearErrors('categories');
    }
    if (selectedCatList.length >= 5) {
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
      setError('categories', { type: 'manual', message: 'Categories are required' });
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

  const onSubmit = async (data: any) => {
    const values = data?.ratingValue?.split(',')?.map((value: any) => parseFloat(value.trim()));
    const isValid = values?.every((value: any) => value >= 0.1 || isNaN(value));

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

    // if (selectedCountryOption?.code) {
    //   formData.country = selectedCountryOption.code.toLowerCase();
    // }
    if (selectedCountry) {
      formData.country = selectedCountry.toLowerCase();
    }
    if (selectedCity) {
      formData.city = selectedCity.toLowerCase();
    }

    if (showQuery && query) {
      formData.query = query;
    }

    formData.filter = [];
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

    // Log the form data
    // console.log("Form Data Submitted:", finalData);
    try {
      setEmailLeads([]);
      setIsSubmitting(true);
      const response: any = await gmbScrapeLeadsData(finalData);
      if (response.status === 201) {
        setEmailLeads(response.data.data);
        reset();
        setSelectedCatOptions([]);
        setSelectedCountryOption(null);
        toast({
          title: response.data.message,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {

      }
    }
    catch (error: any) {
      // console.error("Error fetching email leads:", error);
      toast({
        title: error?.response?.data?.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form>

        <Box>
          <Text as="p" fontSize="16px" fontWeight="500" color="#212529" mb="8px">Search GMB:</Text>
          <FormControl mb={"-20px"}>
            <Flex w="100%" alignItems="center" justifyContent={"flex-end"}>
              <FormLabel fontWeight="400" fontSize="14px" color="#212529" mb={0} mr="2" htmlFor="showAsPopup">
                Plain queries
              </FormLabel>
              <Switch
                defaultChecked={showQuery}
                onChange={(event) => { handleQueryToggle(event.target.checked) }}
                colorScheme="blue"
                size="sm"
                outline={"none"}
                mr="2"
              />
            </Flex>
          </FormControl>
          <Box alignItems="center">
            {!showQuery && <Box mb={"15px"}>
              <FormLabel marginRight="8px">
                Categories <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
              </FormLabel>
              <Multiselect
                options={categoriesData || []}
                onSelect={onSelectCatOptions}
                onRemove={onRemoveCatOptions}
                displayValue="name"
                closeIcon="cancel"
                selectionLimit={5}
                placeholder="Select Options"
                selectedValues={selectedCatOptions}
                className="multiSelectContainer"
              />
              {errors.categories && <p style={{ color: 'red', fontSize: '12px' }}>{errors.categories.message}</p>}
            </Box>}
            {showQuery && <Box mb={"15px"}>
              <FormLabel marginRight="8px">
                Queries (category + city + country)
              </FormLabel>
              <InputGroup
                borderRadius="4px"
                // borderColor="#6C757D"
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
            <Flex gap={2}>
              {/* <Box mb={"15px"} w={"50%"}>
                <Text as="span" marginRight="8px">
                  Country <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
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

              <Box w="31%">
                <FormLabel>Country <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
                <Select
                  placeholder="Select Country"
                  value={selectedCountry}
                  // disabled={disabled}
                  {...register("country", { required: "Country is required" })}
                  onChange={async (e) => {
                    const value = e.target.value;

                    setSelectedCountry(value);
                    clearErrors("country"); // ✅ clear error
                    const allcity: any = await getCitiesOfCountry(e.target.value)
                    // console.log("allcity", allcity);
                    setCities(allcity)
                    // setSelectedState("");
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

              {/* City Dropdown */}
              <Box w="31%">
                <FormLabel>City <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
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
              <Box mb={"15px"} w={"50%"}>
                <FormLabel>
                  Limits <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                </FormLabel>
                <Select
                  width="auto"
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
                {errors.limit && <p style={{ color: 'red', fontSize: '12px' }}>{errors.limit.message}</p>}
              </Box>
            </Flex>
            <Box mb={"15px"}>
              <Text fontWeight={500} marginRight="8px" mt={3} mb="10px">
                Advanced parameters
              </Text>
              <Box mb={"15px"}>
                <FormControl mb={"0px"}>
                  <Flex w="100%" alignItems="center" justifyContent={"space-between"}>
                    <FormLabel fontWeight="500" fontSize="16px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                      Business Status
                    </FormLabel>
                    <Switch
                      defaultChecked={false}
                      onChange={(event) => { businessToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
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
                      defaultChecked={false}
                      onChange={(event) => { verifiedToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
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
                      defaultChecked={false}
                      onChange={(event) => { phoneToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
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
                      onChange={(event) => { ratingToggle(event.target.checked) }}
                      colorScheme="blue"
                      size="lg"
                      outline={"none"}
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
        <Box mt="40px">
          <Flex justifyContent="flex-end">
            <Button onClick={handleSubmit(onSubmit)} type="submit" bg="#2977FF" color="#FFFFFF" fontSize="16px" fontWeight="400" className="btn-hover-pri" isLoading={isSubmitting} disabled={isSubmitting}>
              <Text as="span" fontWeight={500}>
                Fetch Record
              </Text>
            </Button>
          </Flex>
        </Box>
      </form>

      {emailLeads.length > 0 &&
        <Box mt="24px" p={4} border={'1px solid #CED4DA'} borderRadius={'6px'} maxHeight={'350px'} overflowY={'auto'}>
          <Flex color={'#333'} fontSize={'14px'} alignItems="center" mb={2}>
            <Text w={'50%'} fontWeight={600}>Email</Text>
            <Text w={'50%'} fontWeight={600}>Business Name</Text>
          </Flex>
          {emailLeads.map((data: any, index: number) => (
            <Flex key={index} color={'#6C757D'} fontSize={'14px'} alignItems="center" mb={2}>
              <Text w={'50%'}>{data.email}</Text>
              <Text w={'50%'}>{data.businessName}</Text>
            </Flex>
          ))}
        </Box>
      }
    </>
  )
}

export default ScrapeLeads;