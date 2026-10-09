import { Box, Stack, Text, Button, Heading, useToast, Spinner } from "@chakra-ui/react";
import React, { useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import "./EmailTemplateSuperadmin.css";
import { getEmailTemplates, setEmailTemplates } from "../../services/emailTemplatesServices";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface FormData {
  signupEmailText: string;
  forgetPasswordEmailText: string;
  forgetPasswordSuccessEmailText: string;
  inviteUserEmailText: string;
  leadsDataEmailText: string;
  offlineMessagesEmailText: string;
}

export const EmailTemplateSuperadmin = () => {
  const [templates, setTemplates] = useState<any>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormTouched, setIsFormTouched] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState<FormData>({
    signupEmailText: '',
    forgetPasswordEmailText: '',
    forgetPasswordSuccessEmailText: '',
    inviteUserEmailText: '',
    leadsDataEmailText: '',
    offlineMessagesEmailText: '',
  });

  const validateField = (content: string): string | null => {
    // Strip HTML tags and whitespace to check if there's actual content
    const strippedContent = content.replace(/<[^>]*>/g, '').trim();
    return !strippedContent ? 'This field is required' : null;
  };

  const handleEditorChange = (content: string, editorType: keyof FormData) => {
    setIsFormTouched(true);
    setFormData((prevState) => ({
      ...prevState,
      [editorType]: content,
    }));

    // Validate on change
    const error = validateField(content);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [editorType]: error || '',
    }));
  };


  const logoHTML = `<p><br></p>
<p><img src="https://app.ultimabot.ai/icons/logo.png" alt="UltimaBot Logo" style="width: 120px;"></p>`;

  function ensureLogo(htmlText: any) {
    const logoPattern = /<img[^>]+src=["']https:\/\/app\.ultimabot\.ai\/icons\/logo\.png["'][^>]*>/i;

    // console.log("logoPattern.test(htmlText)", logoPattern.test(htmlText));

    if (!logoPattern.test(htmlText)) {
      return htmlText + logoHTML; // append at the end
      // or return logoHTML + htmlText; // prepend at the start
    }
    return htmlText;
  }
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Check if any form field is empty
    Object.keys(formData).forEach((key) => {
      const fieldKey = key as keyof FormData;
      const error = validateField(formData[fieldKey]);
      if (error) {
        newErrors[fieldKey] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      toast({
        title: "Please fill in all required fields",
        status: "error",
        isClosable: true,
      });
      return;
    }



    // console.log("ensureLogo",
    // ensureLogo(formData?.signupEmailText),
    //   "formData", formData
    // );

    // Gather form data for submission
    const dataToSubmit = {
      // usag,
      ...formData,
      signupEmailText: ensureLogo(formData.signupEmailText),
      forgetPasswordEmailText: ensureLogo(formData.forgetPasswordEmailText),
      forgetPasswordSuccessEmailText: ensureLogo(formData.forgetPasswordSuccessEmailText),
      inviteUserEmailText: ensureLogo(formData.inviteUserEmailText),
      leadsDataEmailText: ensureLogo(formData.leadsDataEmailText),
      offlineMessagesEmailText: ensureLogo(formData.offlineMessagesEmailText)
      // ...formData, signupEmailText: formData?.signupEmailText
    };

    // console.log("Data to submit:", dataToSubmit);

    try {
      setIsSubmitting(true);
      const response = await setEmailTemplates(dataToSubmit);

      if (response?.data?.statusCode === 200) {
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        });
      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        });
      }

    } catch (error: any) {

      toast({
        title: `${error?.response?.data?.message}` || error.message,

        status: "error",
        isClosable: true,
      });

    } finally {
      setIsSubmitting(false);
    }

  };

  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const templateData = await getEmailTemplates();
      setTemplates(templateData?.data);
      setIsLoading(false)
      const initialFormData: FormData = {
        signupEmailText: '',
        forgetPasswordEmailText: '',
        forgetPasswordSuccessEmailText: '',
        inviteUserEmailText: '',
        leadsDataEmailText: '',
        offlineMessagesEmailText: '',
      };

      templateData?.data?.getAllTemplates?.forEach((template: any) => {
        initialFormData[template.name as keyof FormData] = template.emailBody || '';
      });

      // console.log("initialFormData", initialFormData)

      setFormData(initialFormData);

      // Clear any existing errors when data is fetched
      setErrors({});
      setIsFormTouched(false);

    } catch (error) {
      setIsLoading(false)

      // console.error('Failed to fetch templates:', error);
    }
  }
  const quillRef = React.useRef<any>(null);

  useEffect(() => {
    // handleInsertImage()
    fetchData();
  }, []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'color', 'code-block', 'align', 'background'
  ];

  const toolbarOptions = [
    [{ header: [1, 2, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    [{ align: [] }],
    ['code-block'],
    ['clean']
  ];

  const modules = {
    toolbar: toolbarOptions,
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" p="6" shadow="sm" h="100%" position="relative" overflow="auto">
      <Box>
        <Heading fontSize="24px" color="#1A202C">Email Templates</Heading>
      </Box>
      <Stack>
        <Box>
          {
            isLoading ?
              <Box minH={"500px"} display={"flex"} height={"100%"} width={"100%"} alignItems={"center"} justifyContent={"center"}>
                <Spinner />
              </Box> :
              <>
                {templates?.getAllTemplates && templates?.getAllTemplates.map((template: any, index: any) => (
                  <Box mt="16px" key={template.name}>
                    <Text as="h3" fontSize="16px" color="#212529" fontWeight="500" mt={index == 0 ? "10px" : "60px"} mb={'10px'}>{template.label}</Text>
                    <ReactQuill
                      theme="snow"
                      ref={quillRef}
                      value={formData[template.name as keyof FormData]}
                      onChange={(content: any) => handleEditorChange(content, template.name)}
                      style={{ height: '250px' }}
                      placeholder="Type your content here..."
                      modules={modules}
                      formats={formats}
                    />
                    {/* Show validation error only if form is touched and there is an error */}
                    {isFormTouched && errors[template.name] && (
                      <Text color="red.500" fontSize="sm" mt={2}>
                        {errors[template.name]}
                      </Text>
                    )}
                  </Box>
                ))}
                <Box mt={6}>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    mt={'60px'}
                    width="150px"
                    isDisabled={isSubmitting}
                  >
                    Update
                  </Button>
                </Box>
              </>
          }
        </Box>
      </Stack>
    </Box>
  );
};