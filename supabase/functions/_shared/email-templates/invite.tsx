/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  main,
  container,
  WORDMARK_URL,
  wordmarkImg,
  h1,
  text,
  button,
  accentBar,
  footer,
  fontImport,
  FOOTER_LINE_1,
  FOOTER_LINE_2,
} from './_chora-styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
    </Head>
    <Preview>você foi convidado pra nachesu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={WORDMARK_URL} alt="NachesU" width="132" height="37" style={wordmarkImg} />
        <Heading style={h1}>
          você foi
          <br />
          convidado
        </Heading>
        <Text style={text}>
          a equipe da nachesu te convidou pras eletivas online. clica no botão pra criar sua conta e começar.
        </Text>
        <Button style={button} href={confirmationUrl}>
          aceitar convite
        </Button>
        <Text style={text}>
          o convite é válido só pro seu email institucional. se chegou por engano, pode ignorar.
        </Text>
        <Hr style={accentBar} />
        <Text style={footer}>
          {FOOTER_LINE_1}
          <br />
          {FOOTER_LINE_2}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
