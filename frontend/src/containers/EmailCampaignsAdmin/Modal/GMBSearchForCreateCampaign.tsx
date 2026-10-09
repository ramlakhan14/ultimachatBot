import React, { useCallback, useState } from "react";
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
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  InputLeftElement,
} from "@chakra-ui/react";
import Multiselect from "multiselect-react-dropdown";
import { IoIosSearch } from "react-icons/io";
import { useForm } from "react-hook-form";
import { setInviteUser } from "../../../services/inviteUserServices";
import categoriesData from "../../Invite Users/Modal/categories.json";
import countriesData from "../../Invite Users/Modal/countries.json";
import styles from "../EmailCampaignsAdmin.module.scss";
import { dataScrappingForCampaign, deleteUnverifiedEmail, getAllCSVUploadedData } from "../../../services/emailCampaigns";
import { SuccessfullyModal } from "./SuccessfullyModal";
import { useHistory } from "react-router-dom";
import { CancelThisCampaign } from "./CancelThisCampaign";

export const GMBSearchForCreateCampaign = ({ dataForClose, campaignId, campaignName }: { dataForClose: () => void, campaignId: any, campaignName: any }) => {
  const toast = useToast();
  const [selectedCatOptions, setSelectedCatOptions] = useState<any>([]);
  const [selectedCountryOption, setSelectedCountryOption] = useState<any>(null);
  const [showQuery, setShowQuery] = useState<boolean>(false);
  const [showBusiness, setShowBusiness] = useState<boolean>(false);
  const [showVerified, setShowVerified] = useState<boolean>(false);
  const [showPhone, setShowPhone] = useState<boolean>(false);
  const [showRating, setShowRating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelThisCampaign, setIsCancelThisCampaign] = useState<boolean>(false);
  const [parsedEmails, setParsedEmails] = useState<any>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const history = useHistory();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm();

  const filteredEmails = parsedEmails.filter((email: any) =>
    email.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCountrySelect = (selectedCountryList: any, selectedCatItem: any) => {
    // Since we want single selection, only keep the first selected item
    setSelectedCountryOption(selectedCatItem);
    if (selectedCountryList.length > 0) {
      clearErrors('country');
    }
  };

  const handleCountryRemove = () => {
    setSelectedCountryOption(null);
    if (!showQuery) {
      setError('country', { type: 'manual', message: 'Country is required' });
    }
  };

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

  const handleQueryToggle = (e: boolean) => {
    setShowQuery(e);
    if (e) {
      clearErrors('categories');
      clearErrors('country');
    }
  };
  const businessToggle = (e: boolean) => {
    setShowBusiness(e);
  };
  const verifiedToggle = (e: boolean) => {
    setShowVerified(e);
  };
  const phoneToggle = (e: boolean) => {
    setShowPhone(e);
  };
  const ratingToggle = (e: boolean) => {
    setShowRating(e);
  };

  const handleRatingValueChange = (e: any) => {
    const value = e.target.value;
    // setInputValue(value);

    // Clear previous error
    clearErrors('ratingValue');

    // Split the input by commas, trim whitespace, and convert to numbers
    const values = value.split(',').map((value: any) => parseFloat(value.trim()));

    // Validate: Check if all numbers are >= 0.1
    const isValid = values.every((value: any) => value >= 0.1 || isNaN(value)); // Allow NaN for empty input

    // Set error if validation fails
    if (!isValid && value) {
      setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
    }
  };


  const getAllUploadedData = async (id: string) => {
    try {
      const response: any = await getAllCSVUploadedData(id);
      const allData = response?.data?.data;
      setParsedEmails(allData); // Updated here

    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });
    }
  }

  React.useEffect(() => {
    if (campaignId !== null) {
      getAllUploadedData(campaignId);
    }
  }, [campaignId]);

  async function delCampaignEmail(emailid: string, campaignId: string) {
    try {
      const response = await deleteUnverifiedEmail({ email: emailid, campaignId: campaignId });
      // setSearchQuery("");

      // getAllUploadedData(campaignId);
      setParsedEmails(response?.data?.data);

      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }
  }


  const onSubmit = async (data: any) => {



    const values = data?.ratingValue?.split(',')?.map((value: any) => parseFloat(value.trim()));

    // Validate: Check if all numbers are >= 0.1
    const isValid = values?.every((value: any) => value >= 0.1 || isNaN(value)); // Allow NaN for empty input

    // Set error if validation fails
    if (!isValid && data?.ratingValue) {
      setError('ratingValue', { type: 'manual', message: 'All numbers must be greater than or equal to 0.1' });
      return;
    }

    if (!showQuery) {
      if (selectedCatOptions.length === 0) {
        setError('categories', { type: 'manual', message: 'Categories are required' });
        return;
      }
      if (!selectedCountryOption && !showQuery) {
        setError('country', { type: 'manual', message: 'Country is required' });
        return;
      }
    }

    // Destructure to exclude unwanted keys based on conditions
    const {
      businessOperator,
      businessValue,
      verifiedOperator,
      verifiedValue,
      phoneOperator,
      phoneValue,
      ratingOperator,
      ratingValue,
      query, // Exclude query if showQuery is false
      ...filteredData
    } = data;

    const formData: any = {
      ...filteredData,
    };

    // Add categories as an array of strings only if it has a value and showQuery is false
    if (!showQuery && selectedCatOptions && selectedCatOptions.length > 0) {
      formData.categories = selectedCatOptions.map((category: any) => category.name);
    }

    // Add country only if it has a value
    if (selectedCountryOption?.code) {
      formData.country = selectedCountryOption.code.toLowerCase();
    }

    // Add query only if showQuery is true
    if (showQuery && query) {
      formData.query = query;
    }

    // Initialize the filter array
    formData.filter = [];

    formData.limit = parseInt(formData?.limit);

    // Add business to the filter array only if showBusiness is true
    if (showBusiness && businessOperator && businessValue) {
      formData.filter.push({
        field: "business status",
        operator: businessOperator,
        value: businessValue,
      });

    }

    // Add verified to the filter array only if showVerified is true
    if (showVerified && verifiedOperator && verifiedValue) {
      formData.filter.push({
        field: "verified",
        operator: verifiedOperator,
        value: verifiedValue,
      });
    }

    // Add phone to the filter array only if showPhone is true
    if (showPhone && phoneOperator && phoneValue) {
      formData.filter.push({
        field: "phone",
        operator: phoneOperator,
        value: phoneValue,
      });
    }

    // Add rating to the filter array only if showRating is true
    if (showRating && ratingOperator && ratingValue) {
      formData.filter.push({
        field: "rating",
        operator: ratingOperator,
        value: ratingValue,
      });
    }
    const newData = {
      ...formData,
      campaignId: campaignId
    };
    try {
      setIsSubmitting(true);
      const response = await dataScrappingForCampaign(newData);
      if (response?.data?.data.length > 0) {
        reset();
        setSelectedCatOptions([]);
        setSelectedCountryOption(null);
        setParsedEmails(response?.data?.data);
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })

      } else {
        setIsSubmitting(false);
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      }

    } catch (error: any) {
      // console.log(error);
      // dataForClose();
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      });

    } finally {
      setIsSubmitting(false);
    }

  };

  const onCloseCanceled = () => {
    setIsOpen(false);
  }

  const onCancelThisCampaign = () => {
    setIsCancelThisCampaign(false);
  }

  const onCancelCampaign = () => {
    setIsCancelThisCampaign(true);
  }
  const handleChildData = () => {
    dataForClose();
    history.push(`/app/email-campaigns`);
  };
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box textAlign="center">
          <Text as="h4" mt="8px" fontSize="18px" fontWeight="700" color="#1A202C">GMB Search</Text>
          <Text as="p" mt="8px" fontSize="14px" fontWeight="400" color="#6C757D">Scrape the data from the GMB listings by using any of the keywords below:</Text>

        </Box>
        <hr style={{ border: "1px soild #E2E8F0", marginTop: "24px", marginBottom: "24px" }} />
        <Box>
          <Text as="p" fontSize="16px" fontWeight="400" color="#212529" mb="8px">Search GMB:</Text>
          <FormControl mb={"-20px"}>
            <Flex w="100%" alignItems="center" justifyContent={"flex-end"}>

              <FormLabel fontWeight="400" fontSize="14px" color="#212529" mb="0" mr="2" htmlFor="showAsPopup">
                Plain queries
              </FormLabel>
              <Switch
                defaultChecked={false}
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
              <Text as="span" marginRight="8px">
                Categories
              </Text>
              <Multiselect
                options={categoriesData}
                // name="particulars"
                selectionLimit={5}
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
              <Text as="span" marginRight="8px">
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
                  // onChange={''}
                  rows={5}
                  {...register('query', { required: 'Search query is required' })}
                />
              </InputGroup>
              {errors.query && <p style={{ color: 'red', fontSize: '12px' }}>{errors.query.message}</p>}
            </Box>}
            <Flex gap={2}>
              <Box mb={"15px"} w={"50%"}>
                <Text as="span" marginRight="8px">
                  Country <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                </Text>
                <Multiselect
                  options={countriesData}
                  // singleSelect
                  selectedValues={selectedCountryOption ? [selectedCountryOption] : []}
                  onSelect={handleCountrySelect}
                  onRemove={handleCountryRemove}
                  displayValue={"name"}
                  showCheckbox={false} // Hide checkboxes for single select
                  placeholder="Select an option"
                // search={true} // Enable the search box
                />
                {errors.country && <p style={{ color: 'red', fontSize: '12px' }}>{errors.country.message}</p>}
              </Box>
              <Box mb={"15px"} w={"50%"}>
                <Text as="span" marginRight="8px">
                  Limits <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
                </Text>
                <Select
                  // onChange={''}
                  width="auto"
                  color="#000000!important"
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
              </Box>
            </Flex>
            <Box mb={"15px"}>
              <Text fontWeight={600} marginRight="8px" mt={3} mb="10px">
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
                      size="md"
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
                        // onChange={''}
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
                        // onChange={''}
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
                      size="md"
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
                        // onChange={''}
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
                        // onChange={''}
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
                      size="md"
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
                        // onChange={''}
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
                        // onChange={''}
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
                      size="md"
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
                        // onChange={''}
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
            <Button bg="#6C757D" color="#FFFFFF" mr={3}
              onClick={onCancelCampaign}
              fontSize="16px" fontWeight="400" className={styles.cancaleBtn} >
              Cancel
            </Button>
            <Button type="submit" bg="#2977FF" color="#FFFFFF" mr={3} fontSize="16px" fontWeight="400" className="btn-hover-pri" isLoading={isSubmitting} disabled={isSubmitting}>
              <Text as="span" ms="8px">
                Fetch Record
              </Text>
            </Button>
          </Flex>
        </Box>
      </form>
      {parsedEmails.length > 0 && (<>
        <Box textAlign="right" mt={4} mb={4}>
          <Flex justifyContent="center">
            <InputGroup
              width="400px"
              // border="1px solid #6C757D"
              borderRadius="4px"
              borderColor="#6C757D"
            >
              <InputLeftElement pointerEvents='none'>
                <IoIosSearch color="#6C757D" />
              </InputLeftElement>
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              // maxW="300px"
              />
            </InputGroup>
          </Flex>

        </Box>

        <TableContainer overflow="auto" w="100%" borderRadius="8px" boxShadow="0px 4px 8px rgba(0, 0, 0, 0.05)">
          <Table variant="simple" >
            <Thead>
              <Tr >
                <Th>#</Th>
                <Th>Email ID</Th>
                <Th>Email Status</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((data: any, index: number) => (
                  <Tr key={data?._id}>
                    <Td>{index + 1}</Td>
                    <Td>{data?.email}</Td>
                    <Td>
                      {data?.isVerified ? (
                        <Text
                          as="span"
                          borderRadius={"50px"}
                          padding={"2px 10px"}
                          fontSize={"13px"}
                          color="#198754"
                          bg="#1987541A"
                        >
                          Verified
                        </Text>
                      ) : (
                        <Text
                          as="span"
                          borderRadius={"50px"}
                          padding={"2px 10px"}
                          fontSize={"13px"}
                          color="#991B1B"
                          bg="#FEE2E2"
                        >
                          Unverified
                        </Text>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        fontSize={12}
                        variant="outline"
                        borderColor="transparent"
                        onClick={() =>
                          delCampaignEmail(data?.email, data?.campaignId)
                        }
                        mr={2}
                        sx={{
                          _focus: {
                            boxShadow: "none", // Removes the focus box shadow
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
              {parsedEmails.length > 0 && parsedEmails.length === 0 && (
                parsedEmails.map((data: any, index: number) => (
                  <Tr key={data?._id}>
                    <Td> {index + 1}</Td>
                    <Td>{data?.email}</Td>
                    <Td>
                      {data?.isVerified === true ? (
                        <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#198754" bg="#1987541A">Verified</Text>
                      ) : (
                        <Text as="span" borderRadius={'50px'} padding={"2px 10px"} fontSize={"13px"} color="#991B1B" bg="#FEE2E2">Unverified</Text>
                      )}

                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        fontSize={12}
                        variant="outline"
                        borderColor="transparent"
                        onClick={() => {
                          delCampaignEmail(data?.email, data?.campaignId);
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
      </>)}
      {parsedEmails.length > 0 && (<Box textAlign="right">
        <Button role="button" colorScheme="blue" mt="12px" onClick={() => {
          dataForClose()
          history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}&targetAudience=${true}`);
          setIsOpen(true);
        }}>Proceed</Button>
      </Box>)}
      <CancelThisCampaign isCancelThisCampaign={isCancelThisCampaign} onCancelThisCampaign={onCancelThisCampaign} sendData={handleChildData} />
      <SuccessfullyModal isOpens={isOpen} onCloseCancel={onCloseCanceled} />
    </>
  )
}
