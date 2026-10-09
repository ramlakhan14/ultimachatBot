import {
  Box,
  Switch,
  Text,
  FormControl,
  FormLabel,
  Input,
  Button,
  Stack,
  Divider,
  useToast,
  Select,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  Flex,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { callApi } from "../../../services/callApi";
import { GoInfo } from "react-icons/go";

export default function WarmupSettings({ details, onClose, getupdatedList }: { details: any; onClose?: () => void; getupdatedList: () => void }) {
  const [emailWarmupEnabled, setEmailWarmupEnabled] = useState(true);
  const [withRampup, setwithRampup] = useState(true);
  const [emailPerDay, setemailPerDay] = useState<any>(20);
  const [rampupValue, setRampupValue] = useState<any>('slow');
  const [titleOpen, setTitleOpen] = useState<boolean>(false);
  const [responseRate, setresponseRate] = useState(20);

  // Custom tag
  const toast = useToast();
  const [tagPart1, setTagPart1] = useState("twice");
  const [tagPart2, setTagPart2] = useState("light");
  const location: any = useLocation();
  const data = location?.state?.data || ""

  useEffect(() => {
    // getData()
    if (details?.length > 0) {
      const resData = details[0]
      setemailPerDay(resData?.emailPerDay)
      setEmailWarmupEnabled(resData?.isWarmUpEnabled)
      setresponseRate(resData?.responseRate)
      setwithRampup(resData?.withRampup)
      setTagPart1(resData?.tags?.[0] || "")
      setTagPart2(resData?.tags?.[1] || "")
      setRampupValue(resData?.rampUpSpeed)
      setLoading(false)
    }

  }, [details])


  const [loading, setLoading] = useState(true);


  const startWarmUp = async (type: string) => {
    try {

      const formdata = {
        "rampup_speed": rampupValue,
        "Ids": details?.map((item: any) => item.mailiveryCampaignId) || [],
      }

      const response: any = await callApi(`/mailivery-warmup/campaigns/bulk-${type}-warmup`, "patch", formdata);
      // console.log(response, "response.resData?.data")
      // setSmtpConfigs(response);
      getupdatedList()
      toast({
        title: response?.data?.message || response.message || "Success",
        status: "success",
        isClosable: true,
      });

    } catch (error: any) {
      // setIsFetching(false)
      toast({
        title: error?.response?.data?.message || error.message || "server error",
        status: "error",
        isClosable: true,
      });
      // console.log(error);
    }
  };
  // /enable-ramp-up
  const handleRamup = async (path: any, value: any) => {
    try {
      const formdata = {
        "rampup_speed": value,
        "Ids": details?.map((item: any) => item.mailiveryCampaignId) || [],
      }
      const response: any = await callApi(`/mailivery-warmup/campaigns/bulk-${path}`, "patch", formdata);
      // setSmtpConfigs(response);
      getupdatedList()
      // getData()
      toast({
        title: response?.data?.message || response.message || "Success",
        status: "success",
        isClosable: true,
      });

    } catch (error: any) {
      // setIsFetching(false)
      toast({
        title: error?.response?.data?.message || error.message || "server error",
        status: "error",
        isClosable: true,
      });
      // console.log(error);
    }
  };
  const [isUpdating, setIsUpdating] = useState(false);
  const submit = async () => {
    try {
      setIsUpdating(true)

      const formdata = {
        "Ids": details?.map((item: any) => item.mailiveryCampaignId?.toString()) || [],
        "responseRate": Number(responseRate),
        "emailPerDay": Number(emailPerDay),
        "tags": [tagPart1, tagPart2],
      }
      const response: any = await callApi(`/mailivery-warmup/campaigns/bulk-update`, "patch", formdata);
      // const response: any = await callApi(`/mailivery-warmup/campaigns/${data?.mailiveryCampaignId}`, "patch", formdata);
      setIsUpdating(false)
      getupdatedList()
      onClose?.()
      toast({
        title: response?.data?.message || response.message || "Success",
        status: "success",
        isClosable: true,
      });
      // setSmtpConfigs(response);

    } catch (error: any) {
      setIsUpdating(false)
      // setIsFetching(false)
      toast({
        title: error?.response?.data?.message || error.message || "server error",
        status: "error",
        isClosable: true,
      });
      // console.log(error);
    }
  };

  // const [error, setError] = useState("");
  const [errors, setErrors] = useState({
    emailPerDay: "",
    responseRate: "",
  });

  const handleChange = (e: any, field: string) => {
    const value = e.target.value;
    const num = Number(value);
    if (field === 'emailPerDay') {
      setemailPerDay(value);
    } else if (field === 'responseRate') {
      setresponseRate(value);
    }

    // validation
    let errorMsg = "";

    if (value !== "") {
      if (field === "emailPerDay") {

        if (num < 10 || num > 200) {
          errorMsg = "Must be between 10 and 200";
        }
      }

      if (field === "responseRate") {
        if (num < 0 || num > 100) {
          errorMsg = "Must be between 0 and 100%";
        }
      }
    }

    // set error for specific field only
    setErrors((prev) => ({
      ...prev,
      [field]: errorMsg,
    }));

  };


  return (
    <Box
      // p={"24px 20px"}
      width={"100%"}
      maxH={"500px"}
      overflowY={"auto"}
      // maxW="600px" mx="auto"
      display={"flex"}
      flexDirection={"column"}
      alignItems="start"
      gap={6}
    >
      {
        loading ?
          <Box display={"flex"} justifyContent={"center"} alignItems={"center"} height={"200px"} width={"100%"}>
            <Spinner />
          </Box> :
          <>
            {/* Email Warmup Toggle */}
            <Flex width={"100%"} justifyContent={"space-between"} align="center" >
              <Text display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>
                Email Warm-up Enabled
                <Popover>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                    >
                      <GoInfo color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#efefef"
                    fontWeight={500}
                    color="#333"
                    p={3}
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
                      Use this setting to bulk activate or pause mailboxes.

                    </Box>
                  </PopoverContent>
                </Popover>
              </Text>
              <Box display={"flex"} alignItems={"center"} width={"140px"} justifyContent={"start"} gap={"4px"}>

                <Switch
                  colorScheme="blue"
                  size="lg"
                  disabled={emailWarmupEnabled}
                  isChecked={emailWarmupEnabled}
                  onChange={(e) => {
                    startWarmUp(e.target.checked ? "resume" : "pause")
                    setEmailWarmupEnabled(e.target.checked)
                  }}
                />
              </Box>
            </Flex>

            {/* Max Emails Per Day */}
            <FormControl display={"flex"} justifyContent={"space-between"} width={"100%"} alignItems={"center"} gap={"4px"}>
              <FormLabel display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>
                {/* Total number of */}
                Warm-up
                emails per day
                <Popover>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                    >
                      <GoInfo color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#efefef"
                    fontWeight={500}
                    color="#333"
                    p={3}
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
                      Enter new emails per day settings for selected mailboxes.

                    </Box>
                  </PopoverContent>
                </Popover>
              </FormLabel>

              <Box>

                <Input
                  type="number"
                  value={emailPerDay}
                  onChange={(e) => handleChange(e, 'emailPerDay')}
                  width="140px"
                  min={10}
                  max={200}
                />
                {errors.emailPerDay && (
                  <Text color="red.500" fontSize="12px">
                    {errors.emailPerDay}
                  </Text>
                )}
              </Box>
            </FormControl>
            {/* REsponse rate  */}
            <FormControl display={"flex"} justifyContent={"space-between"} width={"100%"} alignItems={"center"} gap={"4px"}>
              <FormLabel display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>
                {/* Total number of */}
                Response rate (%)
                <Popover>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                    >
                      <GoInfo color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#efefef"
                    fontWeight={500}
                    color="#333"
                    p={3}
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
                      Enter new reply rate settings for selected mailboxes.

                    </Box>
                  </PopoverContent>
                </Popover>
              </FormLabel>

              <Box>

                <Input
                  type="number"
                  value={responseRate}
                  // onChange={handleChange}
                  onChange={(e) => handleChange(e, 'responseRate')}
                  width="140px"
                  min={10}
                  max={100}
                />
                {errors.responseRate && (
                  <Text color="red.500" fontSize="12px">
                    {errors.responseRate}
                  </Text>
                )}
              </Box>
            </FormControl>

            {/* Daily Rampup */}
            <Flex width={"100%"} justifyContent={"space-between"} align="center" >
              <Text display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>
                {/* Daily Rampup */}
                Ramp-up settings
                <Popover>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                    >
                      <GoInfo color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#efefef"
                    fontWeight={500}
                    color="#333"
                    p={3}
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
                      Use this setting to bulk change ramp-up presets or disable ramp-up.
                    </Box>
                  </PopoverContent>
                </Popover>
              </Text>
              <Box display={"flex"} alignItems={"center"} width={"140px"} justifyContent={"start"} gap={"4px"}>

                <Switch
                  size="lg"
                  colorScheme="blue"
                  isChecked={withRampup}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleRamup("enable-ramp-up", "")
                    } else {
                      handleRamup("disable-ramp-up", "")
                    }
                    setwithRampup(e.target.checked)
                  }}
                />
              </Box>

            </Flex>

            {/* Rampup Value */}
            {
              withRampup &&
              <FormControl display={"flex"} justifyContent={"space-between"} width={"100%"} alignItems={"center"} gap={"4px"}>

                <FormLabel display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>
                  {/* Select Rampup {" "} */}
                  Daily Ramp-up

                  {/* <Text as="span" fontSize="sm" color="gray.500">
              (suggested 5 per day) 
            </Text> */}
                </FormLabel>

                <Select
                  width={"140px"}
                  maxWidth={"300px"}
                  value={rampupValue || ""}
                  onChange={(e) => {
                    handleRamup("enable-ramp-up", e.target.value)
                    setRampupValue(e.target.value)
                  }}
                  color="#6C757D"
                >
                  <option value={"slow"}>Slow</option>
                  <option value={"normal"}>Normal</option>
                  <option value={"fast"}>Fast</option>
                </Select>


              </FormControl>
            }


            {/* Custom Warmup Identifier */}
            <FormControl>
              <FormLabel display={"flex"} color={"#1A202C"} alignItems={"center"} gap={"4px"} lineHeight={"150%"} fontWeight="500" fontSize={'16px'}>Custom Warm-up
                Identifier Tag

                <Popover isOpen={titleOpen} onClose={() => setTitleOpen(false)}>
                  <PopoverTrigger>
                    <Box
                      cursor="pointer"
                      as="span"
                      onClick={() => setTitleOpen(!titleOpen)}
                    >
                      <GoInfo color="#6C757D" />
                    </Box>
                  </PopoverTrigger>
                  <PopoverContent
                    bg="#efefef"
                    fontWeight={500}
                    color="#333"
                    p={3}
                    width="250px"
                    fontSize="12px"
                    border="1px solid #ccc"
                    lineHeight="20px"
                    style={{ boxShadow: 'none' }}
                    borderRadius="4px"
                  >
                    <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                    {/* <PopoverCloseButton /> */}
                    <Box whiteSpace="pre-wrap">This text will be injected into the body of the warmup. It will be two 5 letter words e.g apple-juice.
                    </Box>
                  </PopoverContent>
                </Popover>
              </FormLabel>
              {/* <Text fontSize="14px" color="#6C757D" mb={'10px'}>
                Use this two-worded tag to filter out any Warm-up emails from your
                inbox.
              </Text> */}

              <Stack direction="row" align="center" spacing={4}>
                <Input
                  value={tagPart1}
                  maxLength={30}
                  onChange={(e) => setTagPart1(e.target.value)}
                  width="150px"
                />
                <Text>-</Text>
                <Input
                  value={tagPart2}
                  maxLength={30}
                  onChange={(e) => setTagPart2(e.target.value)}
                  width="150px"
                />
                <Text display={"flex"} alignItems={"center"} gap={"4px"}>= {tagPart1}-{tagPart2}

                </Text>
              </Stack>
            </FormControl>

            <Divider />
            <Flex w="100%" gap={"8px"} justifyContent={"end"} textAlign={'end'}>
              <Button
                // isLoading={isUpdating}
                fontWeight={500}
                background={"#6C757D"}
                color={"#fff"}
                onClick={onClose}
                _hover={{
                  bg: "#6C757D"
                }}
                // colorScheme="gray"
                borderRadius="md">
                Cancel
              </Button>
              <Button
                isLoading={isUpdating}
                fontWeight={500}
                onClick={() => {
                  submit()
                }}
                colorScheme="blue" borderRadius="md">
                Update
              </Button>
            </Flex>

          </>
      }
    </Box>
  );
}
